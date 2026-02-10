// ==============================================
// NXTPrism Override Governance — 메인 클래스
// "예외는 허용, 침묵은 금지"
// ==============================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { EvidencePackBuilder } from '@nxtprism/evidence-pack';
import type { BuildPackInput } from '@nxtprism/evidence-pack';
import type {
  OverrideRequest,
  OverrideRecord,
  OverrideApproval,
  OverrideKpis,
} from './types';

export class OverrideGovernance {
  constructor(
    private supabase: SupabaseClient,
    private packBuilder: EvidencePackBuilder,
  ) {}

  // ============================================
  // Override 생성
  // ============================================

  async createOverride(request: OverrideRequest): Promise<OverrideRecord> {
    const override_id = crypto.randomUUID();
    const now = new Date().toISOString();

    // required_approvals가 비어있으면 즉시 APPROVED, 아니면 PENDING_APPROVAL
    const status = request.required_approvals.length === 0
      ? 'APPROVED'
      : 'PENDING_APPROVAL';

    const record: OverrideRecord = {
      override_id,
      tenant_id: request.tenant_id,
      reason_code: request.reason_code,
      reason_text: request.reason_text,
      impact_scope: request.impact_scope,
      duration_minutes: request.duration_minutes,
      machine_id: request.machine_id,
      asset_ref: request.asset_ref,
      from_state: request.from_state,
      to_state: request.to_state,
      transition_record_id: null,
      required_approvals: request.required_approvals,
      approvals: [],
      status,
      evidence_pack_id: null,
      requested_by: request.requested_by,
      requested_at: now,
      resolved_at: status === 'APPROVED' ? now : null,
    };

    const { error } = await this.supabase.from('overrides').insert({
      override_id: record.override_id,
      tenant_id: record.tenant_id,
      reason_code: record.reason_code,
      reason_text: record.reason_text,
      impact_scope: record.impact_scope,
      duration_minutes: record.duration_minutes,
      machine_id: record.machine_id,
      asset_ref: record.asset_ref,
      from_state: record.from_state,
      to_state: record.to_state,
      required_approvals: record.required_approvals,
      approvals: record.approvals,
      status: record.status,
      requested_by: record.requested_by,
      requested_at: record.requested_at,
      resolved_at: record.resolved_at,
    });

    if (error) throw new Error('Override 생성 실패: ' + error.message);
    return record;
  }

  // ============================================
  // 승인
  // ============================================

  async approveOverride(
    overrideId: string,
    approval: OverrideApproval,
  ): Promise<OverrideRecord> {
    const record = await this.getOverride(overrideId);
    if (!record) throw new Error(`Override를 찾을 수 없습니다: ${overrideId}`);

    if (record.status !== 'PENDING_APPROVAL' && record.status !== 'REQUESTED') {
      throw new Error(`승인 불가 상태: ${record.status}`);
    }

    // 이미 해당 역할로 승인했는지 확인
    const alreadyApproved = record.approvals.some(a => a.role === approval.role);
    if (alreadyApproved) {
      throw new Error(`이미 ${approval.role} 역할로 승인됨`);
    }

    // 역할이 required_approvals에 있는지 확인
    if (!record.required_approvals.includes(approval.role)) {
      throw new Error(`필요하지 않은 역할: ${approval.role}`);
    }

    const updatedApprovals = [...record.approvals, approval];

    // 모든 필요 역할이 승인했는지 확인
    const approvedRoles = new Set(updatedApprovals.map(a => a.role));
    const allApproved = record.required_approvals.every(r => approvedRoles.has(r));

    const newStatus = allApproved ? 'APPROVED' : 'PENDING_APPROVAL';
    const now = new Date().toISOString();

    const { error } = await this.supabase
      .from('overrides')
      .update({
        approvals: updatedApprovals,
        status: newStatus,
        resolved_at: allApproved ? now : null,
      })
      .eq('override_id', overrideId);

    if (error) throw new Error('승인 업데이트 실패: ' + error.message);

    return {
      ...record,
      approvals: updatedApprovals,
      status: newStatus as any,
      resolved_at: allApproved ? now : null,
    };
  }

  // ============================================
  // 거부
  // ============================================

  async rejectOverride(
    overrideId: string,
    actorId: string,
    reason: string,
  ): Promise<OverrideRecord> {
    const record = await this.getOverride(overrideId);
    if (!record) throw new Error(`Override를 찾을 수 없습니다: ${overrideId}`);

    if (record.status === 'EXECUTED' || record.status === 'REJECTED') {
      throw new Error(`거부 불가 상태: ${record.status}`);
    }

    const now = new Date().toISOString();

    const { error } = await this.supabase
      .from('overrides')
      .update({
        status: 'REJECTED',
        resolved_at: now,
        reason_text: record.reason_text + ` [REJECTED by ${actorId}: ${reason}]`,
      })
      .eq('override_id', overrideId);

    if (error) throw new Error('거부 업데이트 실패: ' + error.message);

    return {
      ...record,
      status: 'REJECTED',
      resolved_at: now,
    };
  }

  // ============================================
  // 실행 (+ Override Evidence Pack 자동 생성)
  // ============================================

  async executeOverride(overrideId: string): Promise<OverrideRecord> {
    const record = await this.getOverride(overrideId);
    if (!record) throw new Error(`Override를 찾을 수 없습니다: ${overrideId}`);

    if (record.status !== 'APPROVED') {
      throw new Error(`실행 불가 상태: ${record.status} (APPROVED여야 함)`);
    }

    // 만료 확인
    const requestedAt = new Date(record.requested_at).getTime();
    const expiresAt = requestedAt + record.duration_minutes * 60 * 1000;
    if (Date.now() > expiresAt) {
      // 만료 처리
      await this.supabase
        .from('overrides')
        .update({ status: 'EXPIRED', resolved_at: new Date().toISOString() })
        .eq('override_id', overrideId);

      throw new Error('Override가 만료되었습니다 (duration 초과)');
    }

    // Override Evidence Pack 생성
    const now = new Date().toISOString();
    const decisionId = `OVERRIDE-${overrideId.slice(0, 8).toUpperCase()}`;

    const packInput: BuildPackInput = {
      tenant_id: record.tenant_id,
      decision: {
        decision_id: decisionId,
        tenant_id: record.tenant_id,
        occurred_at: now,
        system: 'override-governance',
        asset_ref: record.asset_ref,
        outcome: {
          type: 'override',
          value: 'OVERRIDE_EXECUTED',
        },
      },
      context_refs: [{
        uri: `prism://overrides/${record.override_id}`,
        hash: `sha256:override-${record.override_id}`,
        hash_alg: 'SHA-256',
        captured_at: record.requested_at,
      }],
      policy: {
        policy_id: 'override-governance',
        policy_version: 'v1.0.0',
        engine: 'override-governance-engine',
        evaluation_result: {
          allowed: true,
          reasons: [
            `Override reason: ${record.reason_code}`,
            `Impact: ${record.impact_scope}`,
            `Approvals: ${record.approvals.map(a => `${a.role}(${a.actor_id})`).join(', ')}`,
          ],
          score: 1.0,
        },
      },
      state_transition: {
        machine_id: record.machine_id,
        machine_version: 'v1.0.0',
        from: record.from_state,
        to: record.to_state,
        trigger: 'OVERRIDE',
      },
      attestations: record.approvals.map(a => ({
        type: 'HUMAN_OVERRIDE' as const,
        actor: { kind: a.actor_kind, id: a.actor_id },
        role: a.role,
        auth_context: { method: 'OVERRIDE_APPROVAL' },
        signed_at: a.approved_at,
        reason: record.reason_text,
      })),
      integrity: {
        prev_hash: 'sha256:override-chain',
        chain_hash: `sha256:override-${record.override_id}`,
      },
      retention: {
        class: 'safety_critical',
        min_retention_days: 3650,
        deletion_strategy: 'NONE',
      },
      privacy: {
        pii_class: 'PII_NONE',
        data_residency: 'KR',
      },
    };

    const pack = await this.packBuilder.buildPack(packInput);

    // Override 상태 업데이트
    const { error } = await this.supabase
      .from('overrides')
      .update({
        status: 'EXECUTED',
        evidence_pack_id: pack.pack_id,
        resolved_at: now,
      })
      .eq('override_id', overrideId);

    if (error) throw new Error('실행 업데이트 실패: ' + error.message);

    return {
      ...record,
      status: 'EXECUTED',
      evidence_pack_id: pack.pack_id,
      resolved_at: now,
    };
  }

  // ============================================
  // 조회
  // ============================================

  async getOverride(overrideId: string): Promise<OverrideRecord | null> {
    const { data, error } = await this.supabase
      .from('overrides')
      .select('*')
      .eq('override_id', overrideId)
      .single();

    if (error || !data) return null;

    return {
      override_id: data.override_id,
      tenant_id: data.tenant_id,
      reason_code: data.reason_code,
      reason_text: data.reason_text,
      impact_scope: data.impact_scope,
      duration_minutes: data.duration_minutes,
      machine_id: data.machine_id,
      asset_ref: data.asset_ref,
      from_state: data.from_state,
      to_state: data.to_state,
      transition_record_id: data.transition_record_id,
      required_approvals: data.required_approvals,
      approvals: data.approvals,
      status: data.status,
      evidence_pack_id: data.evidence_pack_id,
      requested_by: data.requested_by,
      requested_at: data.requested_at,
      resolved_at: data.resolved_at,
    };
  }

  async getOverridesByTenant(
    tenantId: string,
    status?: string,
  ): Promise<OverrideRecord[]> {
    let query = this.supabase
      .from('overrides')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('requested_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw new Error('Override 목록 조회 실패: ' + error.message);
    return (data || []) as OverrideRecord[];
  }

  // ============================================
  // KPI
  // ============================================

  async getOverrideKpis(tenantId: string): Promise<OverrideKpis> {
    const { data, error } = await this.supabase
      .from('overrides')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw new Error('KPI 조회 실패: ' + error.message);
    const records = (data || []) as OverrideRecord[];

    const byStatus: Record<string, number> = {};
    const byReasonCode: Record<string, number> = {};
    const byImpactScope: Record<string, number> = {};
    let totalApprovalMs = 0;
    let approvalCount = 0;

    for (const r of records) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byReasonCode[r.reason_code] = (byReasonCode[r.reason_code] || 0) + 1;
      byImpactScope[r.impact_scope] = (byImpactScope[r.impact_scope] || 0) + 1;

      if (r.resolved_at && (r.status === 'APPROVED' || r.status === 'EXECUTED')) {
        const ms = new Date(r.resolved_at).getTime() - new Date(r.requested_at).getTime();
        totalApprovalMs += ms;
        approvalCount++;
      }
    }

    return {
      tenant_id: tenantId,
      total_count: records.length,
      by_status: byStatus,
      by_reason_code: byReasonCode,
      by_impact_scope: byImpactScope,
      avg_approval_minutes: approvalCount > 0
        ? Math.round((totalApprovalMs / approvalCount / 60000) * 100) / 100
        : null,
    };
  }
}
