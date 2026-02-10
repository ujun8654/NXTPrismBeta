// ==============================================
// NXTPrism Policy Engine — 타입 정의
// SSOT: docs/specs/policy-dsl.schema.json
// ==============================================

/** 비교 연산자 */
export type ComparisonOp = 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NEQ' | 'IN' | 'NOT_IN';

/** 논리 연산자 */
export type LogicalOp = 'AND' | 'OR';

/** 모든 연산자 */
export type Operator = ComparisonOp | LogicalOp;

/** 평가 조건 (재귀 — AND/OR 안에 하위 조건 포함 가능) */
export interface Condition {
  operator: Operator;
  field?: string;              // 비교 연산 시 대상 필드 (예: "input.soh")
  value?: unknown;             // 비교 값
  operands?: Condition[];      // AND/OR일 때 하위 조건들
}

/** 규칙이 매치되었을 때 취할 액션 */
export type ActionType = 'ALLOW' | 'DENY' | 'RESTRICT' | 'REQUIRE_ATTESTATION' | 'ESCALATE';

export interface Action {
  type: ActionType;
  params?: Record<string, unknown>;
}

/** 개별 정책 규칙 */
export interface PolicyRule {
  rule_id: string;
  name?: string;
  priority?: number;                   // 낮을수록 우선
  condition: Condition;
  action: Action;
  evidence_requirements?: string[];    // 필요한 증거 유형
  attestation_requirements?: string[]; // 필요한 승인 역할
}

/** 정책 적용 범위 */
export interface PolicyScope {
  asset_types?: string[];
  tenants?: string[];
  state_machines?: string[];
}

/** 정책 메타데이터 */
export interface PolicyMetadata {
  created_at: string;
  created_by: string;
  authority_profile?: string;  // 예: 'FAA', 'EASA', 'MOLIT'
  references?: string[];       // 근거 문서 URI
}

/** 정책 정의 (버전 관리됨, 불변) */
export interface PolicyDefinition {
  policy_id: string;
  version: string;             // semver: v1.0.0
  name: string;
  description?: string;
  scope?: PolicyScope;
  rules: PolicyRule[];
  metadata: PolicyMetadata;
}

/** DB에 저장되는 정책 버전 레코드 */
export interface PolicyVersionRecord {
  policy_version_id: string;
  policy_id: string;
  version: string;
  name: string;
  description?: string;
  definition: PolicyDefinition;  // 전체 정책 정의 (JSONB)
  is_active: boolean;
  published_at: string;
  published_by: string;
}

/** 개별 규칙 평가 결과 */
export interface RuleEvaluation {
  rule_id: string;
  rule_name?: string;
  condition_met: boolean;
  action: Action;
}

/** 정책 평가 전체 결과 */
export interface PolicyEvalResult {
  policy_id: string;
  policy_version: string;
  allowed: boolean;
  final_action: ActionType;
  matched_rules: RuleEvaluation[];
  all_evaluations: RuleEvaluation[];
  evaluated_at: string;
  evidence_requirements: string[];
  attestation_requirements: string[];
}
