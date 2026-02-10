/** 증거 원장에 저장되는 증거 레코드 */
export interface EvidenceRecord {
  evidence_id: string;
  tenant_id: string;
  sequence_num: number;
  prev_hash: string;
  payload: Record<string, unknown>;
  payload_hash: string;
  chain_hash: string;
  decision_id?: string;
  policy_version_id?: string;
  state_transition_id?: string;
  attestation_refs?: Record<string, unknown>[];
  created_by?: string;
  created_at: string;
}

/** 증거 추가 요청 입력 */
export interface AppendEvidenceInput {
  tenant_id: string;
  payload: Record<string, unknown>;
  decision_id?: string;
  policy_version_id?: string;
  state_transition_id?: string;
  attestation_refs?: Record<string, unknown>[];
  created_by?: string;
}

/** 체인 헤드 (최신 증거 요약) */
export interface ChainHead {
  tenant_id: string;
  evidence_id: string;
  sequence_num: number;
  chain_hash: string;
  created_at: string;
}

/** 체인 검증 결과 */
export interface VerifyResult {
  valid: boolean;
  records_checked: number;
  first_invalid_at?: number;
  error?: string;
}

/** 체크포인트 (Merkle root) */
export interface Checkpoint {
  checkpoint_id: string;
  tenant_id: string;
  sequence_from: number;
  sequence_to: number;
  merkle_root: string;
  head_hash: string;
  record_count: number;
  created_at: string;
}
