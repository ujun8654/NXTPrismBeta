import type {
  StateMachineDefinition,
  TransitionDefinition,
  TransitionRequest,
  GateToken,
} from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** 전이 정의를 찾는다 */
export function findTransition(
  machine: StateMachineDefinition,
  from: string,
  to: string
): TransitionDefinition | undefined {
  return machine.transitions.find((t) => t.from === from && t.to === to);
}

/** 상태가 머신에 존재하는지 확인 */
export function isValidState(machine: StateMachineDefinition, stateId: string): boolean {
  return machine.states.some((s) => s.state_id === stateId);
}

/** Gate Token 유효성 검증 */
export function validateGateToken(
  token: GateToken,
  request: TransitionRequest
): ValidationResult {
  const errors: string[] = [];

  if (token.status !== 'ACTIVE') {
    errors.push(`Gate token status is ${token.status}, expected ACTIVE`);
  }

  if (new Date(token.expires_at) < new Date()) {
    errors.push('Gate token has expired');
  }

  if (token.tenant_id !== request.tenant_id) {
    errors.push('Gate token tenant_id mismatch');
  }

  if (token.machine_id !== request.machine_id) {
    errors.push('Gate token machine_id mismatch');
  }

  if (token.from !== request.from || token.to !== request.to) {
    errors.push(`Gate token transition mismatch: token=${token.from}->${token.to}, request=${request.from}->${request.to}`);
  }

  if (token.asset_ref.type !== request.asset_ref.type || token.asset_ref.id !== request.asset_ref.id) {
    errors.push('Gate token asset_ref mismatch');
  }

  return { valid: errors.length === 0, errors };
}

/** 전이 요청의 Gate 요건 충족 여부 검증 */
export function validateGateRequirements(
  transition: TransitionDefinition,
  request: TransitionRequest
): ValidationResult {
  const errors: string[] = [];
  const gate = transition.gate_requirements;

  // 정책 평가 결과 확인
  if (gate.required_policy_result && gate.policy_id) {
    if (!request.policy_eval_result) {
      errors.push(`Policy evaluation required for policy ${gate.policy_id}`);
    } else if (gate.required_policy_result === 'ALLOW' && !request.policy_eval_result.allowed) {
      errors.push(`Policy ${gate.policy_id} evaluation must be ALLOW`);
    }
  }

  // 필수 승인 역할 확인
  if (gate.required_attestations && gate.required_attestations.length > 0) {
    const providedRoles = (request.attestations || []).map((a) => a.role);
    for (const requiredRole of gate.required_attestations) {
      if (!providedRoles.includes(requiredRole)) {
        errors.push(`Missing required attestation from role: ${requiredRole}`);
      }
    }
  }

  // 필수 증거 타입 확인
  if (gate.required_evidence_types && gate.required_evidence_types.length > 0) {
    const providedEvidence = request.evidence_refs || [];
    if (providedEvidence.length < gate.required_evidence_types.length) {
      errors.push(
        `Required ${gate.required_evidence_types.length} evidence types, got ${providedEvidence.length}`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/** 전이 요청 전체 검증 */
export function validateTransitionRequest(
  machine: StateMachineDefinition,
  request: TransitionRequest
): ValidationResult {
  const errors: string[] = [];

  // 1. 상태 유효성
  if (!isValidState(machine, request.from)) {
    errors.push(`Invalid from state: ${request.from}`);
  }
  if (!isValidState(machine, request.to)) {
    errors.push(`Invalid to state: ${request.to}`);
  }

  // 2. 전이 정의 존재
  const transition = findTransition(machine, request.from, request.to);
  if (!transition) {
    errors.push(`No transition defined from ${request.from} to ${request.to}`);
    return { valid: false, errors };
  }

  // 3. Override 요청인 경우
  if (request.override) {
    if (!transition.allow_override) {
      errors.push(`Override not allowed for transition ${request.from} -> ${request.to}`);
    }
    // Override는 gate 요건 스킵하지만 반드시 사유 + 승인자 필요
    if (!request.override.reason) {
      errors.push('Override requires a reason');
    }
    if (!request.override.approved_by) {
      errors.push('Override requires approved_by');
    }
    return { valid: errors.length === 0, errors };
  }

  // 4. HARD gate인 경우 Gate Token 필수
  if (transition.gate_mode === 'HARD' && !request.gate_token_id) {
    errors.push('HARD gate requires a gate_token_id');
  }

  // 5. Gate 요건 검증
  const gateResult = validateGateRequirements(transition, request);
  errors.push(...gateResult.errors);

  return { valid: errors.length === 0, errors };
}
