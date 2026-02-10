import type { EvidencePack } from '@nxtprism/core-trust';
import type { PolicyEvalResult } from '@nxtprism/policy-engine';

/** Replay 모드 */
export type ReplayMode = 'TRACE' | 'DETERMINISTIC' | 'FULL';

/** Replay 요청 */
export interface ReplayRequest {
  decision_id: string;
  tenant_id: string;
  mode: ReplayMode;
  /** DETERMINISTIC/FULL 모드에서 사용할 정책 입력 데이터 */
  policy_input?: Record<string, unknown>;
  /** FULL 모드: 현재 정책과 비교할지 여부 (기본 true) */
  compare_with_current?: boolean;
}

/** 원본 vs 재평가 비교 */
export interface ReplayComparison {
  original_allowed: boolean;
  original_action: string;
  replayed_allowed: boolean;
  replayed_action: string;
  match: boolean;
}

/** 현재 정책과의 비교 (FULL 모드) */
export interface DriftAnalysis {
  current_policy_version: string;
  current_allowed: boolean;
  current_action: string;
  drift_detected: boolean;
  drift_details?: string;
}

/** Replay 결과 */
export interface ReplayResult {
  decision_id: string;
  mode: ReplayMode;
  pack: {
    pack_id: string;
    pack_hash: string;
  };
  original: {
    policy_id: string;
    policy_version: string;
    allowed: boolean;
    action: string;
    reasons?: string[];
  };
  replayed?: {
    evaluation: PolicyEvalResult;
    comparison: ReplayComparison;
  };
  drift?: DriftAnalysis;
  replayed_at: string;
}
