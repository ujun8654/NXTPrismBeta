import type {
  Decision,
  ContextRef,
  PolicyRef,
  ModelRuntimeRef,
  StateTransition,
  Attestation,
  Integrity,
  Retention,
  Privacy,
  EvidencePack,
} from '@nxtprism/core-trust';

/** Evidence Pack 생성 요청 */
export interface BuildPackInput {
  tenant_id: string;
  decision: Decision;
  context_refs: ContextRef[];
  policy: PolicyRef;
  model_runtime?: ModelRuntimeRef;
  state_transition: StateTransition;
  attestations: Attestation[];
  integrity: Integrity;
  retention: Retention;
  privacy: Privacy;
  evidence_ids?: string[];
}

/** DB에 저장되는 Evidence Pack 레코드 */
export interface PackRecord {
  pack_id: string;
  tenant_id: string;
  decision_id: string;
  pack_version: string;
  manifest: EvidencePack;
  pack_hash: string;
  evidence_ids: string[];
  created_at: string;
}

/** Evidence Pack 검증 결과 */
export interface VerifyPackResult {
  valid: boolean;
  checks: {
    hash_match: boolean;
    version_valid: boolean;
    context_refs_present: boolean;
    attestations_present: boolean;
  };
  error?: string;
}
