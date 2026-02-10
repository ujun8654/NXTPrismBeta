import crypto from 'crypto';
import type { GateToken, TransitionRequest, StateMachineDefinition } from './types';
import { findTransition, validateGateRequirements } from './validator';

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5분

/** Gate Token 발급 */
export function issueGateToken(
  machine: StateMachineDefinition,
  request: TransitionRequest,
  options?: { ttl_ms?: number }
): GateToken {
  const transition = findTransition(machine, request.from, request.to);
  if (!transition) {
    throw new Error(`No transition defined: ${request.from} -> ${request.to}`);
  }

  // Gate 요건 검증
  const validation = validateGateRequirements(transition, request);
  if (!validation.valid) {
    throw new Error(`Gate requirements not met: ${validation.errors.join('; ')}`);
  }

  const now = new Date();
  const ttl = options?.ttl_ms ?? DEFAULT_TTL_MS;

  return {
    token_id: crypto.randomUUID(),
    tenant_id: request.tenant_id,
    machine_id: machine.machine_id,
    machine_version: machine.version,
    asset_ref: request.asset_ref,
    from: request.from,
    to: request.to,
    transition_id: transition.transition_id,
    policy_version: request.policy_eval_result?.policy_version,
    decision_id: undefined as unknown as string,
    issued_at: now.toISOString(),
    expires_at: new Date(now.getTime() + ttl).toISOString(),
    status: 'ACTIVE',
    issued_by: request.triggered_by,
  };
}

/** Gate Token 만료 처리 */
export function expireToken(token: GateToken): GateToken {
  return { ...token, status: 'EXPIRED' };
}

/** Gate Token 사용 처리 */
export function consumeToken(token: GateToken): GateToken {
  return { ...token, status: 'USED' };
}
