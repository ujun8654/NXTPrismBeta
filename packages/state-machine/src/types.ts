// ==============================================
// NXTPrism State Machine — 타입 정의
// SSOT: Architecture Spec Section 8
// ==============================================

/** 상태 정의 */
export interface StateDefinition {
  state_id: string;          // 예: 'SERVICEABLE', 'GROUNDED'
  name: string;
  description?: string;
  is_initial?: boolean;
  is_terminal?: boolean;
}

/** 전이에 필요한 조건 (Gate Rule) */
export interface GateRequirement {
  required_policy_result?: 'ALLOW' | 'ALLOW_OR_ATTESTATION';
  required_attestations?: string[];       // 필요한 역할 목록 (예: ['CERTIFYING_STAFF'])
  required_evidence_types?: string[];     // 필요한 증거 타입 (예: ['BATTERY_SOH_CHECK'])
  policy_id?: string;                     // 평가할 정책 ID
}

/** 전이 정의 */
export interface TransitionDefinition {
  transition_id: string;
  from: string;
  to: string;
  name: string;
  trigger_type: 'POLICY_DECISION' | 'HUMAN_ACTION' | 'SYSTEM_EVENT' | 'OVERRIDE';
  gate_mode: 'HARD' | 'SOFT' | 'SHADOW';
  gate_requirements: GateRequirement;
  allow_override?: boolean;
}

/** 상태 머신 정의 (전체) */
export interface StateMachineDefinition {
  machine_id: string;
  version: string;
  name: string;
  description?: string;
  domain: string;             // 예: 'airworthiness', 'flight-ops'
  states: StateDefinition[];
  transitions: TransitionDefinition[];
  metadata?: Record<string, unknown>;
}

/** Gate Token — 전이 승인 토큰 */
export interface GateToken {
  token_id: string;
  tenant_id: string;
  machine_id: string;
  machine_version: string;
  asset_ref: { type: string; id: string };
  from: string;
  to: string;
  transition_id: string;
  policy_version?: string;
  decision_id?: string;
  issued_at: string;
  expires_at: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
  issued_by: string;
}

/** 전이 실행 요청 */
export interface TransitionRequest {
  tenant_id: string;
  machine_id: string;
  asset_ref: { type: string; id: string };
  from: string;
  to: string;
  gate_token_id?: string;
  attestations?: TransitionAttestation[];
  evidence_refs?: string[];
  policy_eval_result?: {
    policy_id: string;
    policy_version: string;
    allowed: boolean;
    final_action: string;
  };
  override?: {
    reason: string;
    approved_by: string;
    role: string;
  };
  triggered_by: string;
}

/** 전이 시 승인 정보 */
export interface TransitionAttestation {
  role: string;
  actor_id: string;
  actor_kind: 'human' | 'service';
}

/** 전이 실행 결과 (DB 저장) */
export interface TransitionRecord {
  transition_record_id: string;
  tenant_id: string;
  machine_id: string;
  machine_version: string;
  asset_ref: { type: string; id: string };
  from: string;
  to: string;
  transition_id: string;
  gate_token_id: string | null;
  gate_mode: 'HARD' | 'SOFT' | 'SHADOW';
  result: 'COMMITTED' | 'DENIED' | 'OVERRIDDEN';
  override_reason?: string;
  attestations: TransitionAttestation[];
  evidence_refs: string[];
  policy_eval_ref?: string;
  triggered_by: string;
  created_at: string;
}

/** 자산의 현재 상태 */
export interface AssetState {
  tenant_id: string;
  machine_id: string;
  asset_ref: { type: string; id: string };
  current_state: string;
  last_transition_id: string | null;
  updated_at: string;
}
