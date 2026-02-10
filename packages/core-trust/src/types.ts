// ==============================================
// NXTPrism Trust Objects — TypeScript 타입 정의
// SSOT: docs/specs/trust-objects.schema.json
//       docs/specs/evidence-pack.schema.json
// ==============================================

/** 자산 참조 */
export interface AssetRef {
  type: string;   // 예: 'aircraft', 'component', 'drone'
  id: string;     // 자산 고유 ID
}

/** 결정 결과 */
export interface Outcome {
  type: string;   // 예: 'restrict_operation', 'return_to_service'
  value: string;  // 예: 'NO_GO', 'GO'
}

/** 불변 결정 객체 — 어떤 자산에 대해 어떤 결과가 왜 내려졌는지 */
export interface Decision {
  decision_id: string;
  tenant_id: string;
  occurred_at: string;    // ISO 8601
  system: string;         // 결정을 내린 시스템
  asset_ref: AssetRef;
  outcome: Outcome;
  confidence?: number;    // 0~1
  extensions?: Record<string, unknown>;
}

/** 입력 데이터의 참조 — 원본은 외부에, 해시만 보관 */
export interface ContextRef {
  uri: string;
  hash: string;           // 예: 'sha256:abc...'
  hash_alg: 'SHA-256' | 'SHA-384' | 'SHA-512';
  captured_at: string;    // ISO 8601
  redaction_profile?: string;
  feature_summary_ref?: string;
}

/** 정책 평가 결과 */
export interface EvaluationResult {
  allowed: boolean;
  reasons?: string[];
  score?: number;
}

/** 결정에 적용된 정책 참조 */
export interface PolicyRef {
  policy_id: string;
  policy_version: string;
  engine: string;         // 예: 'deterministic-policy-engine'
  evaluation_trace_ref?: string;
  evaluation_result: EvaluationResult;
}

/** AI 모델/런타임 정보 */
export interface ModelRuntimeRef {
  model_ref?: { uri: string; digest: string };
  preprocess_ref?: { git_commit: string; digest: string };
  container_image_digest?: string;
  runtime_versions?: Record<string, string>;
  sbom_ref?: string;
}

/** 상태 전이 기록 */
export interface StateTransition {
  machine_id: string;
  machine_version: string;
  from: string;
  to: string;
  trigger: string;        // 예: 'AI_RECOMMENDATION', 'HUMAN_OVERRIDE'
  gate_mode?: 'SHADOW' | 'SOFT' | 'HARD';
  gate_token_id?: string;
}

/** 승인자 정보 */
export interface Actor {
  kind: 'service' | 'human';
  id: string;
}

/** 인증 컨텍스트 */
export interface AuthContext {
  method: string;       // 예: 'KMS_HSM', 'OIDC'
  idp?: string;
  mfa?: boolean;
  key_id?: string;
}

/** 승인/서명 기록 */
export interface Attestation {
  type: 'ORG_ATTESTATION' | 'HUMAN_APPROVAL' | 'HUMAN_OVERRIDE';
  actor: Actor;
  role: string;           // 예: 'OPERATOR', 'QA_APPROVER'
  auth_context: AuthContext;
  signed_at: string;      // ISO 8601
  signature_ref?: string;
  reason?: string;        // HUMAN_OVERRIDE 시 사유
}

/** 해시 체인 무결성 정보 */
export interface Integrity {
  prev_hash: string;
  chain_hash: string;
  checkpoint_ref?: string;
  external_anchor_refs?: string[];
}

/** 보존 정책 */
export interface Retention {
  class: 'safety_critical' | 'operational' | 'general';
  min_retention_days: number;
  deletion_strategy: 'CRYPTO_SHREDDING' | 'TOMBSTONE' | 'NONE';
}

/** 프라이버시 메타데이터 */
export interface Privacy {
  pii_class: 'PII_NONE' | 'PII_PRESENT' | 'PII_MASKED';
  data_residency: string;  // 국가 코드 (예: 'KR', 'US')
  masking_applied?: boolean;
}

/** Evidence Pack — 감사/보험/규제 제출용 증거 컨테이너 */
export interface EvidencePack {
  pack_version: '1.0';
  decision: Decision;
  context_refs: ContextRef[];
  policy: PolicyRef;
  model_runtime?: ModelRuntimeRef;
  state_transition: StateTransition;
  attestations: Attestation[];
  integrity: Integrity;
  retention: Retention;
  privacy: Privacy;
}

/** 테넌트 */
export interface Tenant {
  tenant_id: string;
  name: string;
  isolation: 'row' | 'schema';
  locale?: string;
  created_at: string;
}
