import { SupabaseClient } from '@supabase/supabase-js';
import { evaluateCondition } from './evaluator';
import type {
  PolicyDefinition,
  PolicyVersionRecord,
  PolicyEvalResult,
  RuleEvaluation,
  ActionType,
} from './types';

/**
 * PolicyEngine — NXTPrism 정책 평가 엔진
 *
 * 핵심 원칙:
 * - 결정적(Deterministic): 같은 입력 + 같은 정책 = 항상 같은 결과
 * - 버전 불변: 한번 배포된 정책은 수정 불가, 새 버전만 추가
 * - 추적 가능: 어떤 규칙이 왜 매치되었는지 전부 기록
 */
export class PolicyEngine {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 정책 배포 — 새 버전을 DB에 저장
   * 이전 버전은 자동 비활성화 (불변 보존)
   */
  async publishPolicy(
    definition: PolicyDefinition,
    publishedBy: string
  ): Promise<PolicyVersionRecord> {
    // 같은 policy_id의 기존 활성 버전 비활성화
    await this.supabase
      .from('policy_versions')
      .update({ is_active: false })
      .eq('policy_id', definition.policy_id)
      .eq('is_active', true);

    // 새 버전 삽입
    const record = {
      policy_id: definition.policy_id,
      version: definition.version,
      name: definition.name,
      description: definition.description || null,
      definition: definition,
      is_active: true,
      published_by: publishedBy,
    };

    const { data, error } = await this.supabase
      .from('policy_versions')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Policy publish failed: ${error.message}`);
    }

    return data as PolicyVersionRecord;
  }

  /**
   * 활성 정책 조회 — policy_id로 현재 활성 버전 가져오기
   */
  async getActivePolicy(policyId: string): Promise<PolicyDefinition | null> {
    const { data, error } = await this.supabase
      .from('policy_versions')
      .select('*')
      .eq('policy_id', policyId)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    return (data as PolicyVersionRecord).definition;
  }

  /**
   * 특정 버전 정책 조회 (Replay용)
   */
  async getPolicyByVersion(policyId: string, version: string): Promise<PolicyDefinition | null> {
    const { data, error } = await this.supabase
      .from('policy_versions')
      .select('*')
      .eq('policy_id', policyId)
      .eq('version', version)
      .single();

    if (error || !data) return null;
    return (data as PolicyVersionRecord).definition;
  }

  /**
   * 정책 평가 — 핵심 함수
   *
   * 입력 데이터를 정책의 모든 규칙에 대해 평가하고,
   * 최종 허용/거부 결정을 내림.
   *
   * 규칙은 priority 오름차순으로 평가 (낮은 숫자 = 높은 우선순위)
   * DENY가 하나라도 있으면 최종 DENY (deny-wins)
   */
  evaluate(policy: PolicyDefinition, input: Record<string, unknown>): PolicyEvalResult {
    // priority 기준 정렬 (낮은 숫자 우선)
    const sortedRules = [...policy.rules].sort(
      (a, b) => (a.priority ?? 999) - (b.priority ?? 999)
    );

    const allEvaluations: RuleEvaluation[] = [];
    const matchedRules: RuleEvaluation[] = [];
    const evidenceReqs: string[] = [];
    const attestationReqs: string[] = [];

    for (const rule of sortedRules) {
      const conditionMet = evaluateCondition(rule.condition, input);

      const evaluation: RuleEvaluation = {
        rule_id: rule.rule_id,
        rule_name: rule.name,
        condition_met: conditionMet,
        action: rule.action,
      };

      allEvaluations.push(evaluation);

      if (conditionMet) {
        matchedRules.push(evaluation);

        if (rule.evidence_requirements) {
          evidenceReqs.push(...rule.evidence_requirements);
        }
        if (rule.attestation_requirements) {
          attestationReqs.push(...rule.attestation_requirements);
        }
      }
    }

    // 최종 결정: deny-wins 전략
    let finalAction: ActionType = 'ALLOW';
    let allowed = true;

    for (const matched of matchedRules) {
      if (matched.action.type === 'DENY') {
        finalAction = 'DENY';
        allowed = false;
        break;
      }
      if (matched.action.type === 'RESTRICT') {
        finalAction = 'RESTRICT';
        allowed = false;
      }
      if (matched.action.type === 'REQUIRE_ATTESTATION' && finalAction !== 'RESTRICT') {
        finalAction = 'REQUIRE_ATTESTATION';
      }
      if (matched.action.type === 'ESCALATE' && finalAction === 'ALLOW') {
        finalAction = 'ESCALATE';
      }
    }

    return {
      policy_id: policy.policy_id,
      policy_version: policy.version,
      allowed,
      final_action: finalAction,
      matched_rules: matchedRules,
      all_evaluations: allEvaluations,
      evaluated_at: new Date().toISOString(),
      evidence_requirements: [...new Set(evidenceReqs)],
      attestation_requirements: [...new Set(attestationReqs)],
    };
  }

  /**
   * 편의 메서드: policy_id로 활성 정책을 가져와서 바로 평가
   */
  async evaluateByPolicyId(
    policyId: string,
    input: Record<string, unknown>
  ): Promise<PolicyEvalResult> {
    const policy = await this.getActivePolicy(policyId);
    if (!policy) {
      throw new Error(`Active policy not found: ${policyId}`);
    }
    return this.evaluate(policy, input);
  }
}
