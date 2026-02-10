// ==============================================
// NXTPrism Export & Audit Report — 타입 정의
// ==============================================

/** 내보내기 유형 */
export type ExportType =
  | 'AUDIT_REPORT'
  | 'DECISION_EXPORT'
  | 'CHAIN_AUDIT'
  | 'COMPLIANCE_SNAPSHOT'
  | 'OVERRIDE_HISTORY';

/** 내보내기 요청 옵션 */
export interface ExportOptions {
  requested_by: string;
  date_from?: string;   // ISO 8601
  date_to?: string;     // ISO 8601
}

// ============================================
// 종합 감사 보고서
// ============================================

export interface AuditReport {
  report_id: string;
  tenant_id: string;
  generated_at: string;
  period: { from: string | null; to: string };
  chain_integrity: ChainIntegritySection;
  evidence_stats: EvidenceStatsSection;
  policy_timeline: PolicyTimelineEntry[];
  transition_summary: TransitionSummarySection;
  override_kpis: OverrideKpisSection;
  asset_states: AssetStateEntry[];
  checkpoints: CheckpointEntry[];
}

export interface ChainIntegritySection {
  valid: boolean;
  records_checked: number;
  first_invalid_at?: number;
  error?: string;
}

export interface EvidenceStatsSection {
  total_records: number;
  earliest_at: string | null;
  latest_at: string | null;
  by_decision: number;         // decision_id가 있는 건수
  by_policy: number;           // policy_version_id가 있는 건수
  by_transition: number;       // state_transition_id가 있는 건수
}

export interface PolicyTimelineEntry {
  policy_id: string;
  version: string;
  name: string;
  is_active: boolean;
  published_at: string;
  published_by: string;
}

export interface TransitionSummarySection {
  total_transitions: number;
  by_result: Record<string, number>;      // COMMITTED, DENIED, OVERRIDDEN
  by_gate_mode: Record<string, number>;   // HARD, SOFT, SHADOW
  by_machine: Record<string, number>;
}

export interface OverrideKpisSection {
  total_count: number;
  by_status: Record<string, number>;
  by_reason_code: Record<string, number>;
  by_impact_scope: Record<string, number>;
  avg_approval_minutes: number | null;
}

export interface AssetStateEntry {
  machine_id: string;
  asset_type: string;
  asset_id: string;
  current_state: string;
  updated_at: string;
}

export interface CheckpointEntry {
  checkpoint_id: string;
  sequence_from: number;
  sequence_to: number;
  merkle_root: string;
  record_count: number;
  created_at: string;
}

// ============================================
// 개별 결정 내보내기
// ============================================

export interface DecisionExport {
  export_id: string;
  tenant_id: string;
  decision_id: string;
  exported_at: string;
  pack: {
    pack_id: string;
    pack_hash: string;
    manifest: Record<string, unknown>;
  };
  related_evidence: {
    evidence_id: string;
    sequence_num: number;
    chain_hash: string;
    created_at: string;
  }[];
}

// ============================================
// 체인 무결성 감사
// ============================================

export interface ChainAuditResult {
  audit_id: string;
  tenant_id: string;
  audited_at: string;
  chain_integrity: ChainIntegritySection;
  checkpoints: CheckpointEntry[];
  summary: string;
}

// ============================================
// 규정 준수 스냅샷
// ============================================

export interface ComplianceSnapshot {
  snapshot_id: string;
  tenant_id: string;
  captured_at: string;
  chain_valid: boolean;
  total_evidence: number;
  total_packs: number;
  active_policies: PolicyTimelineEntry[];
  asset_states: AssetStateEntry[];
  override_summary: {
    total: number;
    pending: number;
    executed: number;
    rejected: number;
  };
}

// ============================================
// Override 이력 내보내기
// ============================================

export interface OverrideHistoryExport {
  export_id: string;
  tenant_id: string;
  exported_at: string;
  kpis: OverrideKpisSection;
  records: OverrideExportEntry[];
}

export interface OverrideExportEntry {
  override_id: string;
  reason_code: string;
  reason_text: string;
  impact_scope: string;
  machine_id: string;
  asset_ref: Record<string, unknown>;
  from_state: string;
  to_state: string;
  status: string;
  approvals: Record<string, unknown>[];
  evidence_pack_id: string | null;
  requested_by: string;
  requested_at: string;
  resolved_at: string | null;
}

// ============================================
// DB 저장용 레코드
// ============================================

export interface AuditExportRecord {
  export_id: string;
  tenant_id: string;
  export_type: ExportType;
  requested_by: string;
  report: Record<string, unknown>;
  report_hash: string;
  created_at: string;
}
