import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  StateMachineDefinition,
  TransitionRequest,
  TransitionRecord,
  GateToken,
  AssetState,
} from './types';
import { validateTransitionRequest, validateGateToken, findTransition } from './validator';
import { issueGateToken, consumeToken } from './gate';

export class StateMachineManager {
  constructor(private supabase: SupabaseClient) {}

  // ============================================
  // 머신 정의 관리
  // ============================================

  /** 상태 머신 정의 등록/업데이트 */
  async registerMachine(machine: StateMachineDefinition, registered_by: string) {
    const { data, error } = await this.supabase
      .from('state_machines')
      .upsert({
        machine_id: machine.machine_id,
        version: machine.version,
        name: machine.name,
        domain: machine.domain,
        definition: machine,
        registered_by,
        created_at: new Date().toISOString(),
      }, { onConflict: 'machine_id,version' })
      .select()
      .single();

    if (error) throw new Error('Failed to register machine: ' + error.message);
    return data;
  }

  /** 머신 정의 조회 */
  async getMachine(machineId: string, version?: string): Promise<StateMachineDefinition | null> {
    let query = this.supabase
      .from('state_machines')
      .select('definition')
      .eq('machine_id', machineId);

    if (version) {
      query = query.eq('version', version);
    } else {
      query = query.order('created_at', { ascending: false }).limit(1);
    }

    const { data, error } = await query.single();
    if (error || !data) return null;
    return data.definition as StateMachineDefinition;
  }

  // ============================================
  // Gate Token
  // ============================================

  /** Gate Token 발급 — 전이 승인 */
  async authorizeTransition(
    machineId: string,
    request: TransitionRequest,
    options?: { ttl_ms?: number }
  ): Promise<GateToken> {
    const machine = await this.getMachine(machineId);
    if (!machine) throw new Error(`Machine not found: ${machineId}`);

    // 자산의 현재 상태 확인
    const currentState = await this.getAssetState(
      request.tenant_id,
      machineId,
      request.asset_ref
    );
    if (currentState && currentState.current_state !== request.from) {
      throw new Error(
        `Asset current state is ${currentState.current_state}, but requested from ${request.from}`
      );
    }

    const token = issueGateToken(machine, request, options);

    // DB에 저장
    const { error } = await this.supabase.from('gate_tokens').insert({
      token_id: token.token_id,
      tenant_id: token.tenant_id,
      machine_id: token.machine_id,
      machine_version: token.machine_version,
      asset_type: token.asset_ref.type,
      asset_id: token.asset_ref.id,
      from_state: token.from,
      to_state: token.to,
      transition_id: token.transition_id,
      policy_version: token.policy_version,
      issued_at: token.issued_at,
      expires_at: token.expires_at,
      status: token.status,
      issued_by: token.issued_by,
    });

    if (error) throw new Error('Failed to store gate token: ' + error.message);
    return token;
  }

  /** Gate Token 조회 */
  async getGateToken(tokenId: string): Promise<GateToken | null> {
    const { data, error } = await this.supabase
      .from('gate_tokens')
      .select('*')
      .eq('token_id', tokenId)
      .single();

    if (error || !data) return null;

    return {
      token_id: data.token_id,
      tenant_id: data.tenant_id,
      machine_id: data.machine_id,
      machine_version: data.machine_version,
      asset_ref: { type: data.asset_type, id: data.asset_id },
      from: data.from_state,
      to: data.to_state,
      transition_id: data.transition_id,
      policy_version: data.policy_version,
      decision_id: data.decision_id,
      issued_at: data.issued_at,
      expires_at: data.expires_at,
      status: data.status,
      issued_by: data.issued_by,
    };
  }

  // ============================================
  // 전이 실행
  // ============================================

  /** 전이 커밋 — 실제 상태 변경 */
  async commitTransition(request: TransitionRequest): Promise<TransitionRecord> {
    const machine = await this.getMachine(request.machine_id);
    if (!machine) throw new Error(`Machine not found: ${request.machine_id}`);

    const transition = findTransition(machine, request.from, request.to);
    if (!transition) {
      throw new Error(`No transition: ${request.from} -> ${request.to}`);
    }

    // 1. 전이 요건 검증
    const validation = validateTransitionRequest(machine, request);

    // Override가 아닌데 검증 실패 시
    if (!validation.valid && !request.override) {
      const record = await this.saveTransitionRecord(machine, transition, request, 'DENIED');
      return record;
    }

    // 2. HARD gate인 경우 Gate Token 검증
    if (transition.gate_mode === 'HARD' && request.gate_token_id && !request.override) {
      const token = await this.getGateToken(request.gate_token_id);
      if (!token) throw new Error('Gate token not found');

      const tokenValidation = validateGateToken(token, request);
      if (!tokenValidation.valid) {
        throw new Error(`Invalid gate token: ${tokenValidation.errors.join('; ')}`);
      }

      // 토큰 소비 (일회용)
      await this.supabase
        .from('gate_tokens')
        .update({ status: 'USED' })
        .eq('token_id', token.token_id);
    }

    // 3. 결과 결정
    const result = request.override ? 'OVERRIDDEN' : 'COMMITTED';

    // 4. 전이 기록 저장
    const record = await this.saveTransitionRecord(machine, transition, request, result);

    // 5. 자산 상태 업데이트
    await this.updateAssetState(request, record.transition_record_id);

    return record;
  }

  // ============================================
  // 자산 상태
  // ============================================

  /** 자산의 현재 상태 조회 */
  async getAssetState(
    tenantId: string,
    machineId: string,
    assetRef: { type: string; id: string }
  ): Promise<AssetState | null> {
    const { data, error } = await this.supabase
      .from('asset_states')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('machine_id', machineId)
      .eq('asset_type', assetRef.type)
      .eq('asset_id', assetRef.id)
      .single();

    if (error || !data) return null;

    return {
      tenant_id: data.tenant_id,
      machine_id: data.machine_id,
      asset_ref: { type: data.asset_type, id: data.asset_id },
      current_state: data.current_state,
      last_transition_id: data.last_transition_id,
      updated_at: data.updated_at,
    };
  }

  /** 자산 상태 업데이트 (upsert) */
  private async updateAssetState(request: TransitionRequest, transitionRecordId: string) {
    const { error } = await this.supabase
      .from('asset_states')
      .upsert({
        tenant_id: request.tenant_id,
        machine_id: request.machine_id,
        asset_type: request.asset_ref.type,
        asset_id: request.asset_ref.id,
        current_state: request.to,
        last_transition_id: transitionRecordId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,machine_id,asset_type,asset_id' });

    if (error) throw new Error('Failed to update asset state: ' + error.message);
  }

  /** 전이 기록 저장 */
  private async saveTransitionRecord(
    machine: StateMachineDefinition,
    transition: { transition_id: string; gate_mode: string },
    request: TransitionRequest,
    result: 'COMMITTED' | 'DENIED' | 'OVERRIDDEN'
  ): Promise<TransitionRecord> {
    const record: TransitionRecord = {
      transition_record_id: crypto.randomUUID(),
      tenant_id: request.tenant_id,
      machine_id: machine.machine_id,
      machine_version: machine.version,
      asset_ref: request.asset_ref,
      from: request.from,
      to: request.to,
      transition_id: transition.transition_id,
      gate_token_id: request.gate_token_id || null,
      gate_mode: transition.gate_mode as 'HARD' | 'SOFT' | 'SHADOW',
      result,
      override_reason: request.override?.reason,
      attestations: request.attestations || [],
      evidence_refs: request.evidence_refs || [],
      policy_eval_ref: request.policy_eval_result
        ? `${request.policy_eval_result.policy_id}@${request.policy_eval_result.policy_version}`
        : undefined,
      triggered_by: request.triggered_by,
      created_at: new Date().toISOString(),
    };

    const { error } = await this.supabase.from('transition_records').insert({
      transition_record_id: record.transition_record_id,
      tenant_id: record.tenant_id,
      machine_id: record.machine_id,
      machine_version: record.machine_version,
      asset_type: record.asset_ref.type,
      asset_id: record.asset_ref.id,
      from_state: record.from,
      to_state: record.to,
      transition_id: record.transition_id,
      gate_token_id: record.gate_token_id,
      gate_mode: record.gate_mode,
      result: record.result,
      override_reason: record.override_reason,
      attestations: record.attestations,
      evidence_refs: record.evidence_refs,
      policy_eval_ref: record.policy_eval_ref,
      triggered_by: record.triggered_by,
      created_at: record.created_at,
    });

    if (error) throw new Error('Failed to save transition record: ' + error.message);
    return record;
  }

  // ============================================
  // 전이 이력 조회
  // ============================================

  /** 자산의 전이 이력 조회 */
  async getTransitionHistory(
    tenantId: string,
    machineId: string,
    assetRef: { type: string; id: string },
    limit = 50
  ) {
    const { data, error } = await this.supabase
      .from('transition_records')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('machine_id', machineId)
      .eq('asset_type', assetRef.type)
      .eq('asset_id', assetRef.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error('Failed to get transition history: ' + error.message);
    return data || [];
  }
}
