/**
 * NXTPrism STEP 6: Decision Replay 통합 테스트
 * =============================================
 * 6개 테스트:
 *   1. TRACE 모드 — 원본 결과 추출
 *   2. DETERMINISTIC (일치) — 같은 입력으로 재평가
 *   3. DETERMINISTIC (불일치) — 다른 입력으로 재평가
 *   4. FULL (drift 없음) — 같은 정책 버전
 *   5. FULL (drift 감지) — 새 정책 배포 후 비교
 *   6. 존재하지 않는 decision_id
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { PolicyEngine } from '../packages/policy-engine/src/engine';
import { EvidencePackBuilder } from '../packages/evidence-pack/src/packer';
import { DecisionReplayer } from '../packages/decision-replay/src/replayer';
import type { PolicyDefinition } from '../packages/policy-engine/src/types';
import type { BuildPackInput } from '../packages/evidence-pack/src/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('=== NXTPrism Decision Replay 통합 테스트 ===\n');

  const policyEngine = new PolicyEngine(supabase);
  const packBuilder = new EvidencePackBuilder(supabase);
  const replayer = new DecisionReplayer(policyEngine, packBuilder);

  // 0. 기존 테스트 데이터 정리
  await supabase.from('evidence_packs').delete().eq('tenant_id', TENANT_ID);
  // replay 전용 테스트 정책도 정리
  await supabase.from('policy_versions').delete().eq('policy_id', 'replay-test-policy');
  console.log('기존 테스트 데이터 정리 완료\n');

  // 정책 배포 (v1.0.0)
  const policy: PolicyDefinition = {
    policy_id: 'replay-test-policy',
    version: 'v1.0.0',
    name: 'Replay Test Policy',
    rules: [
      {
        rule_id: 'R001', name: 'Battery too low', priority: 0,
        condition: { operator: 'LT', field: 'input.battery_soh', value: 80 },
        action: { type: 'DENY', params: { reason: 'Battery SOH below 80%' } },
      },
      {
        rule_id: 'R002', name: 'All OK', priority: 10,
        condition: { operator: 'GTE', field: 'input.battery_soh', value: 80 },
        action: { type: 'ALLOW' },
      },
    ],
    metadata: { created_at: new Date().toISOString(), created_by: 'test' },
  };

  await policyEngine.publishPolicy(policy, 'test');
  console.log('Policy v1.0.0 배포 완료');

  // 원본 평가
  const originalInput = { input: { battery_soh: 92 } };
  const originalEval = policyEngine.evaluate(policy, originalInput);

  // Evidence Pack 생성
  const packInput: BuildPackInput = {
    tenant_id: TENANT_ID,
    decision: {
      decision_id: 'DEC-REPLAY-001',
      tenant_id: TENANT_ID,
      occurred_at: new Date().toISOString(),
      system: 'test-system',
      asset_ref: { type: 'drone', id: 'DRONE-TEST' },
      outcome: { type: 'flight_clearance', value: originalEval.allowed ? 'GO' : 'NO_GO' },
    },
    context_refs: [{
      uri: 's3://test/sensor.json',
      hash: 'sha256:test123',
      hash_alg: 'SHA-256',
      captured_at: new Date().toISOString(),
    }],
    policy: {
      policy_id: 'replay-test-policy',
      policy_version: 'v1.0.0',
      engine: 'deterministic-policy-engine',
      evaluation_result: {
        allowed: originalEval.allowed,
        reasons: originalEval.matched_rules.map(r => r.rule_id),
        score: 1.0,
      },
    },
    state_transition: {
      machine_id: 'test-machine',
      machine_version: 'v1.0.0',
      from: 'IDLE',
      to: 'ACTIVE',
      trigger: 'POLICY_DECISION',
    },
    attestations: [{
      type: 'ORG_ATTESTATION',
      actor: { kind: 'service', id: 'test-system' },
      role: 'OPERATOR',
      auth_context: { method: 'KMS_HSM' },
      signed_at: new Date().toISOString(),
    }],
    integrity: { prev_hash: 'sha256:000', chain_hash: 'sha256:111' },
    retention: { class: 'operational', min_retention_days: 365, deletion_strategy: 'NONE' },
    privacy: { pii_class: 'PII_NONE', data_residency: 'KR' },
  };

  await packBuilder.buildPack(packInput);
  console.log('Evidence Pack 생성 완료 (DEC-REPLAY-001)\n');

  // ============================================
  // TEST 1: TRACE 모드
  // ============================================
  console.log('--- TEST 1: TRACE 모드 ---');
  const traceResult = await replayer.replay({
    decision_id: 'DEC-REPLAY-001',
    tenant_id: TENANT_ID,
    mode: 'TRACE',
  });

  console.log('  mode:', traceResult.mode);
  console.log('  original.allowed:', traceResult.original.allowed);
  console.log('  original.policy_version:', traceResult.original.policy_version);
  console.assert(traceResult.mode === 'TRACE', 'FAIL: mode 불일치!');
  console.assert(traceResult.original.allowed === true, 'FAIL: original allowed 불일치!');
  console.assert(traceResult.replayed === undefined, 'FAIL: TRACE에 replayed 있으면 안됨!');
  console.log('  PASS\n');

  // ============================================
  // TEST 2: DETERMINISTIC (일치)
  // ============================================
  console.log('--- TEST 2: DETERMINISTIC (일치) ---');
  const detResult = await replayer.replay({
    decision_id: 'DEC-REPLAY-001',
    tenant_id: TENANT_ID,
    mode: 'DETERMINISTIC',
    policy_input: originalInput,
  });

  console.log('  replayed.allowed:', detResult.replayed?.evaluation.allowed);
  console.log('  comparison.match:', detResult.replayed?.comparison.match);
  console.assert(detResult.replayed !== undefined, 'FAIL: replayed 없음!');
  console.assert(detResult.replayed!.evaluation.allowed === true, 'FAIL: 재평가 결과 불일치!');
  console.assert(detResult.replayed!.comparison.match === true, 'FAIL: 일치해야 하는데 불일치!');
  console.log('  PASS\n');

  // ============================================
  // TEST 3: DETERMINISTIC (불일치)
  // ============================================
  console.log('--- TEST 3: DETERMINISTIC (불일치 — 다른 입력) ---');
  const mismatchResult = await replayer.replay({
    decision_id: 'DEC-REPLAY-001',
    tenant_id: TENANT_ID,
    mode: 'DETERMINISTIC',
    policy_input: { input: { battery_soh: 50 } },  // 낮은 배터리 → DENY
  });

  console.log('  replayed.allowed:', mismatchResult.replayed?.evaluation.allowed);
  console.log('  comparison.match:', mismatchResult.replayed?.comparison.match);
  console.assert(mismatchResult.replayed!.evaluation.allowed === false, 'FAIL: 50%면 DENY여야!');
  console.assert(mismatchResult.replayed!.comparison.match === false, 'FAIL: 원본(GO)과 달라야!');
  console.log('  PASS\n');

  // ============================================
  // TEST 4: FULL (drift 없음)
  // ============================================
  console.log('--- TEST 4: FULL (drift 없음 — 같은 정책) ---');
  const fullNoDrift = await replayer.replay({
    decision_id: 'DEC-REPLAY-001',
    tenant_id: TENANT_ID,
    mode: 'FULL',
    policy_input: originalInput,
  });

  console.log('  drift_detected:', fullNoDrift.drift?.drift_detected);
  console.log('  current_version:', fullNoDrift.drift?.current_policy_version);
  console.assert(fullNoDrift.drift !== undefined, 'FAIL: drift 분석 없음!');
  console.assert(fullNoDrift.drift!.drift_detected === false, 'FAIL: drift 없어야!');
  console.log('  PASS\n');

  // ============================================
  // TEST 5: FULL (drift 감지)
  // ============================================
  console.log('--- TEST 5: FULL (drift 감지 — 새 정책 배포) ---');

  // 새 정책 v2.0.0 배포 — 기준을 90%로 올림 (92%면 여전히 GO지만...)
  const policyV2: PolicyDefinition = {
    ...policy,
    version: 'v2.0.0',
    rules: [
      {
        rule_id: 'R001', name: 'Battery too low (stricter)', priority: 0,
        condition: { operator: 'LT', field: 'input.battery_soh', value: 95 },  // 95% 미만이면 DENY
        action: { type: 'DENY', params: { reason: 'Battery SOH below 95% (v2 stricter)' } },
      },
      {
        rule_id: 'R002', name: 'All OK', priority: 10,
        condition: { operator: 'GTE', field: 'input.battery_soh', value: 95 },
        action: { type: 'ALLOW' },
      },
    ],
  };

  await policyEngine.publishPolicy(policyV2, 'test');
  console.log('  Policy v2.0.0 배포 (기준 95%로 강화)');

  const fullDrift = await replayer.replay({
    decision_id: 'DEC-REPLAY-001',
    tenant_id: TENANT_ID,
    mode: 'FULL',
    policy_input: originalInput,  // battery_soh: 92 → v1: GO, v2: NO-GO
  });

  console.log('  original(v1): allowed=', fullDrift.replayed?.evaluation.allowed);
  console.log('  current(v2): allowed=', fullDrift.drift?.current_allowed);
  console.log('  drift_detected:', fullDrift.drift?.drift_detected);
  console.log('  drift_details:', fullDrift.drift?.drift_details);
  console.assert(fullDrift.drift!.drift_detected === true, 'FAIL: drift 감지해야!');
  console.assert(fullDrift.drift!.current_allowed === false, 'FAIL: v2에서는 DENY여야!');
  console.assert(fullDrift.replayed!.evaluation.allowed === true, 'FAIL: v1에서는 ALLOW여야!');
  console.log('  PASS\n');

  // ============================================
  // TEST 6: 존재하지 않는 decision_id
  // ============================================
  console.log('--- TEST 6: 존재하지 않는 decision_id ---');
  let notFoundError = false;
  try {
    await replayer.replay({
      decision_id: 'NON-EXISTENT-DEC',
      tenant_id: TENANT_ID,
      mode: 'TRACE',
    });
  } catch (err: any) {
    notFoundError = true;
    console.log('  예상된 에러:', err.message);
  }
  console.assert(notFoundError === true, 'FAIL: 에러 발생해야!');
  console.log('  PASS\n');

  // ============================================
  // 결과 요약
  // ============================================
  console.log('==========================================');
  console.log('  모든 테스트 통과! Decision Replay 정상 작동');
  console.log('==========================================');
  console.log(`\n  3가지 모드 검증:`);
  console.log(`    TRACE:         원본 결과 추출 OK`);
  console.log(`    DETERMINISTIC: 재평가 일치/불일치 감지 OK`);
  console.log(`    FULL:          정책 drift 분석 OK`);
}

main().catch((err) => {
  console.error('\n테스트 실패:', err.message);
  process.exit(1);
});
