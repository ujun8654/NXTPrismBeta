import { PolicyEngine } from '@nxtprism/policy-engine';
import { EvidencePackBuilder } from '@nxtprism/evidence-pack';
import type { ReplayRequest, ReplayResult, ReplayComparison, DriftAnalysis } from './types';

/**
 * DecisionReplayer — 과거 결정 재현 엔진
 *
 * 핵심 원칙:
 * - TRACE: 원본 결과만 조회 (재실행 없음)
 * - DETERMINISTIC: 당시 정책 + 입력으로 재평가 → 일치 여부 확인
 * - FULL: 위 + 현재 정책으로도 재평가 → 정책 drift 분석
 */
export class DecisionReplayer {
  constructor(
    private policyEngine: PolicyEngine,
    private packBuilder: EvidencePackBuilder
  ) {}

  /**
   * Decision Replay 실행
   */
  async replay(request: ReplayRequest): Promise<ReplayResult> {
    // 1. Evidence Pack 조회
    const pack = await this.packBuilder.getPackByDecision(request.tenant_id, request.decision_id);
    if (!pack) {
      throw new Error(`Evidence Pack을 찾을 수 없습니다: decision_id=${request.decision_id}`);
    }

    const manifest = pack.manifest;
    const originalResult = manifest.policy.evaluation_result;

    // 기본 결과 (TRACE 모드)
    const result: ReplayResult = {
      decision_id: request.decision_id,
      mode: request.mode,
      pack: {
        pack_id: pack.pack_id,
        pack_hash: pack.pack_hash,
      },
      original: {
        policy_id: manifest.policy.policy_id,
        policy_version: manifest.policy.policy_version,
        allowed: originalResult.allowed,
        action: originalResult.reasons?.[0] || (originalResult.allowed ? 'ALLOW' : 'DENY'),
        reasons: originalResult.reasons,
      },
      replayed_at: new Date().toISOString(),
    };

    // TRACE 모드면 여기서 종료
    if (request.mode === 'TRACE') {
      return result;
    }

    // 2. DETERMINISTIC: 원본 정책으로 재평가
    if (!request.policy_input) {
      throw new Error('DETERMINISTIC/FULL 모드에는 policy_input이 필요합니다');
    }

    const originalPolicy = await this.policyEngine.getPolicyByVersion(
      manifest.policy.policy_id,
      manifest.policy.policy_version
    );

    if (!originalPolicy) {
      throw new Error(`원본 정책을 찾을 수 없습니다: ${manifest.policy.policy_id}@${manifest.policy.policy_version}`);
    }

    const replayedEval = this.policyEngine.evaluate(originalPolicy, request.policy_input);

    const comparison: ReplayComparison = {
      original_allowed: originalResult.allowed,
      original_action: originalResult.reasons?.[0] || (originalResult.allowed ? 'ALLOW' : 'DENY'),
      replayed_allowed: replayedEval.allowed,
      replayed_action: replayedEval.final_action,
      match: originalResult.allowed === replayedEval.allowed,
    };

    result.replayed = {
      evaluation: replayedEval,
      comparison,
    };

    // 3. FULL: 현재 정책과 비교
    if (request.mode === 'FULL') {
      const compareWithCurrent = request.compare_with_current !== false;

      if (compareWithCurrent) {
        const currentPolicy = await this.policyEngine.getActivePolicy(manifest.policy.policy_id);

        if (currentPolicy) {
          const currentEval = this.policyEngine.evaluate(currentPolicy, request.policy_input);

          const driftDetected = replayedEval.allowed !== currentEval.allowed ||
            replayedEval.final_action !== currentEval.final_action;

          const drift: DriftAnalysis = {
            current_policy_version: currentPolicy.version,
            current_allowed: currentEval.allowed,
            current_action: currentEval.final_action,
            drift_detected: driftDetected,
          };

          if (driftDetected) {
            drift.drift_details =
              `원본(${manifest.policy.policy_version}): ${replayedEval.final_action} → ` +
              `현재(${currentPolicy.version}): ${currentEval.final_action}`;
          }

          result.drift = drift;
        }
      }
    }

    return result;
  }
}
