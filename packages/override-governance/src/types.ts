// ==============================================
// NXTPrism Override Governance — 타입 정의
// SSOT: Architecture Spec §8.3, §10.6
// ==============================================

/** 이유 코드 */
export type ReasonCode =
  | 'EMERGENCY_SAFETY'
  | 'MAINTENANCE_REQUIRED'
  | 'REGULATORY_WAIVER'
  | 'OPERATIONAL_NECESSITY'
  | 'OTHER';

/** 영향 범위 */
export type ImpactScope = 'single_asset' | 'fleet' | 'system';

/** Override 상태 */
export type OverrideStatus =
  | 'REQUESTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'EXPIRED';

/** Override 생성 요청 */
export interface OverrideRequest {
  tenant_id: string;
  reason_code: ReasonCode;
  reason_text: string;
  impact_scope: ImpactScope;
  duration_minutes: number;
  machine_id: string;
  asset_ref: { type: string; id: string };
  from_state: string;
  to_state: string;
  required_approvals: string[];   // 필요한 역할 (예: ['SUPERVISOR', 'COMPLIANCE'])
  requested_by: string;
}

/** 개별 승인 */
export interface OverrideApproval {
  role: string;
  actor_id: string;
  actor_kind: 'human' | 'service';
  approved_at: string;
}

/** Override DB 레코드 */
export interface OverrideRecord {
  override_id: string;
  tenant_id: string;
  reason_code: ReasonCode;
  reason_text: string;
  impact_scope: ImpactScope;
  duration_minutes: number;
  machine_id: string;
  asset_ref: { type: string; id: string };
  from_state: string;
  to_state: string;
  transition_record_id: string | null;
  required_approvals: string[];
  approvals: OverrideApproval[];
  status: OverrideStatus;
  evidence_pack_id: string | null;
  requested_by: string;
  requested_at: string;
  resolved_at: string | null;
}

/** Override KPI */
export interface OverrideKpis {
  tenant_id: string;
  total_count: number;
  by_status: Record<string, number>;
  by_reason_code: Record<string, number>;
  by_impact_scope: Record<string, number>;
  avg_approval_minutes: number | null;
}
