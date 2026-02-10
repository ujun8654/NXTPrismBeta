// ==============================================
// NXTPrism Export & Audit Report — 메인 클래스
// 감사 보고서 생성 + DB 저장 + 무결성 해시
// ==============================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { EvidenceLedger } from '@nxtprism/evidence-ledger';
import type { EvidencePackBuilder } from '@nxtprism/evidence-pack';
import type { OverrideGovernance } from '@nxtprism/override-governance';
import { hashPayload } from '@nxtprism/evidence-ledger';
import type {
  ExportType,
  ExportOptions,
  AuditReport,
  DecisionExport,
  ChainAuditResult,
  ComplianceSnapshot,
  OverrideHistoryExport,
  AuditExportRecord,
  EvidenceStatsSection,
  PolicyTimelineEntry,
  TransitionSummarySection,
  AssetStateEntry,
  CheckpointEntry,
  OverrideExportEntry,
} from './types';

export class AuditExporter {
  constructor(
    private supabase: SupabaseClient,
    private ledger: EvidenceLedger,
    private packBuilder: EvidencePackBuilder,
    private governance: OverrideGovernance,
  ) {}

  // ============================================
  // 1. 종합 감사 보고서
  // ============================================

  async generateAuditReport(
    tenantId: string,
    options?: ExportOptions,
  ): Promise<AuditReport> {
    const now = new Date().toISOString();

    // 병렬로 데이터 수집
    const [
      chainIntegrity,
      evidenceStats,
      policyTimeline,
      transitionSummary,
      overrideKpis,
      assetStates,
      checkpoints,
    ] = await Promise.all([
      this.ledger.verifyChain(tenantId),
      this.queryEvidenceStats(tenantId),
      this.queryPolicyTimeline(tenantId),
      this.queryTransitionSummary(tenantId),
      this.governance.getOverrideKpis(tenantId),
      this.queryAssetStates(tenantId),
      this.queryCheckpoints(tenantId),
    ]);

    const report: AuditReport = {
      report_id: crypto.randomUUID(),
      tenant_id: tenantId,
      generated_at: now,
      period: {
        from: options?.date_from || null,
        to: options?.date_to || now,
      },
      chain_integrity: chainIntegrity,
      evidence_stats: evidenceStats,
      policy_timeline: policyTimeline,
      transition_summary: transitionSummary,
      override_kpis: overrideKpis,
      asset_states: assetStates,
      checkpoints,
    };

    // DB에 저장
    await this.saveExport(tenantId, 'AUDIT_REPORT', report, options?.requested_by || 'system');

    return report;
  }

  // ============================================
  // 2. 개별 결정 내보내기
  // ============================================

  async exportDecision(
    tenantId: string,
    decisionId: string,
    options?: ExportOptions,
  ): Promise<DecisionExport> {
    // Evidence Pack 조회
    const pack = await this.packBuilder.getPackByDecision(tenantId, decisionId);
    if (!pack) {
      throw new Error(`Evidence Pack을 찾을 수 없습니다: decision_id=${decisionId}`);
    }

    // 연관 증거 조회
    const { data: evidenceRecords } = await this.supabase
      .from('evidence_records')
      .select('evidence_id, sequence_num, chain_hash, created_at')
      .eq('tenant_id', tenantId)
      .eq('decision_id', decisionId)
      .order('sequence_num', { ascending: true });

    const result: DecisionExport = {
      export_id: crypto.randomUUID(),
      tenant_id: tenantId,
      decision_id: decisionId,
      exported_at: new Date().toISOString(),
      pack: {
        pack_id: pack.pack_id,
        pack_hash: pack.pack_hash,
        manifest: pack.manifest as unknown as Record<string, unknown>,
      },
      related_evidence: (evidenceRecords || []).map((r: any) => ({
        evidence_id: r.evidence_id,
        sequence_num: r.sequence_num,
        chain_hash: r.chain_hash,
        created_at: r.created_at,
      })),
    };

    await this.saveExport(tenantId, 'DECISION_EXPORT', result, options?.requested_by || 'system');

    return result;
  }

  // ============================================
  // 3. 체인 무결성 감사
  // ============================================

  async auditChainIntegrity(
    tenantId: string,
    options?: ExportOptions,
  ): Promise<ChainAuditResult> {
    const [chainIntegrity, checkpoints] = await Promise.all([
      this.ledger.verifyChain(tenantId),
      this.queryCheckpoints(tenantId),
    ]);

    const result: ChainAuditResult = {
      audit_id: crypto.randomUUID(),
      tenant_id: tenantId,
      audited_at: new Date().toISOString(),
      chain_integrity: chainIntegrity,
      checkpoints,
      summary: chainIntegrity.valid
        ? `체인 무결성 정상 — ${chainIntegrity.records_checked}건 검증 완료, 체크포인트 ${checkpoints.length}개`
        : `체인 무결성 오류 — sequence ${chainIntegrity.first_invalid_at}에서 변조 탐지: ${chainIntegrity.error}`,
    };

    await this.saveExport(tenantId, 'CHAIN_AUDIT', result, options?.requested_by || 'system');

    return result;
  }

  // ============================================
  // 4. 규정 준수 스냅샷
  // ============================================

  async generateComplianceSnapshot(
    tenantId: string,
    options?: ExportOptions,
  ): Promise<ComplianceSnapshot> {
    const [
      chainResult,
      evidenceStats,
      activePolicies,
      assetStates,
      overrideKpis,
    ] = await Promise.all([
      this.ledger.verifyChain(tenantId),
      this.queryEvidenceStats(tenantId),
      this.queryActivePolicies(tenantId),
      this.queryAssetStates(tenantId),
      this.governance.getOverrideKpis(tenantId),
    ]);

    // Evidence Pack 총 건수
    const { count: packCount } = await this.supabase
      .from('evidence_packs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const result: ComplianceSnapshot = {
      snapshot_id: crypto.randomUUID(),
      tenant_id: tenantId,
      captured_at: new Date().toISOString(),
      chain_valid: chainResult.valid,
      total_evidence: evidenceStats.total_records,
      total_packs: packCount || 0,
      active_policies: activePolicies,
      asset_states: assetStates,
      override_summary: {
        total: overrideKpis.total_count,
        pending: (overrideKpis.by_status['PENDING_APPROVAL'] || 0) + (overrideKpis.by_status['REQUESTED'] || 0),
        executed: overrideKpis.by_status['EXECUTED'] || 0,
        rejected: overrideKpis.by_status['REJECTED'] || 0,
      },
    };

    await this.saveExport(tenantId, 'COMPLIANCE_SNAPSHOT', result, options?.requested_by || 'system');

    return result;
  }

  // ============================================
  // 5. Override 이력 내보내기
  // ============================================

  async exportOverrideHistory(
    tenantId: string,
    options?: ExportOptions,
  ): Promise<OverrideHistoryExport> {
    const [kpis, overrides] = await Promise.all([
      this.governance.getOverrideKpis(tenantId),
      this.governance.getOverridesByTenant(tenantId),
    ]);

    const records: OverrideExportEntry[] = overrides.map((o: any) => ({
      override_id: o.override_id,
      reason_code: o.reason_code,
      reason_text: o.reason_text,
      impact_scope: o.impact_scope,
      machine_id: o.machine_id,
      asset_ref: o.asset_ref,
      from_state: o.from_state,
      to_state: o.to_state,
      status: o.status,
      approvals: o.approvals,
      evidence_pack_id: o.evidence_pack_id,
      requested_by: o.requested_by,
      requested_at: o.requested_at,
      resolved_at: o.resolved_at,
    }));

    const result: OverrideHistoryExport = {
      export_id: crypto.randomUUID(),
      tenant_id: tenantId,
      exported_at: new Date().toISOString(),
      kpis,
      records,
    };

    await this.saveExport(tenantId, 'OVERRIDE_HISTORY', result, options?.requested_by || 'system');

    return result;
  }

  // ============================================
  // 이전 내보내기 조회
  // ============================================

  async getExport(exportId: string): Promise<AuditExportRecord | null> {
    const { data, error } = await this.supabase
      .from('audit_exports')
      .select('*')
      .eq('export_id', exportId)
      .single();

    if (error || !data) return null;
    return data as AuditExportRecord;
  }

  async getExportsByTenant(tenantId: string): Promise<AuditExportRecord[]> {
    const { data, error } = await this.supabase
      .from('audit_exports')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new Error('내보내기 목록 조회 실패: ' + error.message);
    return (data || []) as AuditExportRecord[];
  }

  // ============================================
  // Private: DB 저장 (보고서 해시 포함)
  // ============================================

  private async saveExport(
    tenantId: string,
    exportType: ExportType,
    report: Record<string, unknown>,
    requestedBy: string,
  ): Promise<string> {
    const exportId = (report as any).report_id
      || (report as any).export_id
      || (report as any).audit_id
      || (report as any).snapshot_id
      || crypto.randomUUID();

    const reportHash = hashPayload(report);

    const { error } = await this.supabase.from('audit_exports').insert({
      export_id: exportId,
      tenant_id: tenantId,
      export_type: exportType,
      requested_by: requestedBy,
      report,
      report_hash: reportHash,
    });

    if (error) throw new Error('내보내기 저장 실패: ' + error.message);
    return exportId;
  }

  // ============================================
  // Private: 데이터 수집 쿼리
  // ============================================

  private async queryEvidenceStats(tenantId: string): Promise<EvidenceStatsSection> {
    const { data, error } = await this.supabase
      .from('evidence_records')
      .select('evidence_id, decision_id, policy_version_id, state_transition_id, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) throw new Error('증거 통계 조회 실패: ' + error.message);
    const records = data || [];

    return {
      total_records: records.length,
      earliest_at: records.length > 0 ? records[0].created_at : null,
      latest_at: records.length > 0 ? records[records.length - 1].created_at : null,
      by_decision: records.filter((r: any) => r.decision_id).length,
      by_policy: records.filter((r: any) => r.policy_version_id).length,
      by_transition: records.filter((r: any) => r.state_transition_id).length,
    };
  }

  private async queryPolicyTimeline(tenantId: string): Promise<PolicyTimelineEntry[]> {
    // policy_versions는 tenant_id가 없으므로 전체 조회
    const { data, error } = await this.supabase
      .from('policy_versions')
      .select('policy_id, version, name, is_active, published_at, published_by')
      .order('published_at', { ascending: true });

    if (error) throw new Error('정책 타임라인 조회 실패: ' + error.message);
    return (data || []) as PolicyTimelineEntry[];
  }

  private async queryActivePolicies(tenantId: string): Promise<PolicyTimelineEntry[]> {
    const { data, error } = await this.supabase
      .from('policy_versions')
      .select('policy_id, version, name, is_active, published_at, published_by')
      .eq('is_active', true);

    if (error) throw new Error('활성 정책 조회 실패: ' + error.message);
    return (data || []) as PolicyTimelineEntry[];
  }

  private async queryTransitionSummary(tenantId: string): Promise<TransitionSummarySection> {
    const { data, error } = await this.supabase
      .from('transition_records')
      .select('result, gate_mode, machine_id')
      .eq('tenant_id', tenantId);

    if (error) throw new Error('전이 요약 조회 실패: ' + error.message);
    const records = data || [];

    const byResult: Record<string, number> = {};
    const byGateMode: Record<string, number> = {};
    const byMachine: Record<string, number> = {};

    for (const r of records as any[]) {
      byResult[r.result] = (byResult[r.result] || 0) + 1;
      byGateMode[r.gate_mode] = (byGateMode[r.gate_mode] || 0) + 1;
      byMachine[r.machine_id] = (byMachine[r.machine_id] || 0) + 1;
    }

    return {
      total_transitions: records.length,
      by_result: byResult,
      by_gate_mode: byGateMode,
      by_machine: byMachine,
    };
  }

  private async queryAssetStates(tenantId: string): Promise<AssetStateEntry[]> {
    const { data, error } = await this.supabase
      .from('asset_states')
      .select('machine_id, asset_type, asset_id, current_state, updated_at')
      .eq('tenant_id', tenantId);

    if (error) throw new Error('자산 상태 조회 실패: ' + error.message);
    return (data || []) as AssetStateEntry[];
  }

  private async queryCheckpoints(tenantId: string): Promise<CheckpointEntry[]> {
    const { data, error } = await this.supabase
      .from('checkpoints')
      .select('checkpoint_id, sequence_from, sequence_to, merkle_root, record_count, created_at')
      .eq('tenant_id', tenantId)
      .order('sequence_from', { ascending: true });

    if (error) throw new Error('체크포인트 조회 실패: ' + error.message);
    return (data || []) as CheckpointEntry[];
  }
}
