/**
 * NXTPrism STEP 7: Override Governance 통합 테스트
 * ================================================
 * 8개 테스트:
 *   1. Override 요청 생성
 *   2. 단일 승인 (SUPERVISOR)
 *   3. 다중 승인 (Break-glass: SUPERVISOR + COMPLIANCE)
 *   4. Override 거부
 *   5. 실행 + Override Evidence Pack 자동 생성
 *   6. KPI 조회
 *   7. 만료된 Override 실행 불가
 *   8. 중복 실행 방지
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { EvidencePackBuilder } from '../packages/evidence-pack/src/packer';
import { OverrideGovernance } from '../packages/override-governance/src/governance';
import type { OverrideRequest } from '../packages/override-governance/src/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

function makeOverrideRequest(overrides?: Partial<OverrideRequest>): OverrideRequest {
  return {
    tenant_id: TENANT_ID,
    reason_code: 'EMERGENCY_SAFETY',
    reason_text: '긴급 안전 조치 — 배터리 센서 오작동으로 강제 상태 전이 필요',
    impact_scope: 'single_asset',
    duration_minutes: 60,
    machine_id: 'drone-airworthiness',
    asset_ref: { type: 'drone', id: 'DRONE-OVERRIDE-TEST' },
    from_state: 'SERVICEABLE',
    to_state: 'GROUNDED',
    required_approvals: ['SUPERVISOR'],
    requested_by: 'operator-kim',
    ...overrides,
  };
}

async function main() {
  console.log('=== NXTPrism Override Governance 통합 테스트 ===\n');

  const packBuilder = new EvidencePackBuilder(supabase);
  const governance = new OverrideGovernance(supabase, packBuilder);

  // 0. 기존 테스트 데이터 정리
  await supabase.from('overrides').delete().eq('tenant_id', TENANT_ID);
  // Override Evidence Pack도 정리
  await supabase.from('evidence_packs').delete().match({
    tenant_id: TENANT_ID,
  });
  console.log('기존 테스트 데이터 정리 완료\n');

  // ============================================
  // TEST 1: Override 요청 생성
  // ============================================
  console.log('--- TEST 1: Override 요청 생성 ---');
  const req1 = makeOverrideRequest();
  const override1 = await governance.createOverride(req1);

  console.log('  override_id:', override1.override_id);
  console.log('  status:', override1.status);
  console.log('  reason_code:', override1.reason_code);
  console.assert(override1.override_id !== undefined, 'FAIL: override_id 없음!');
  console.assert(override1.status === 'PENDING_APPROVAL', 'FAIL: status가 PENDING_APPROVAL이어야!');
  console.assert(override1.reason_code === 'EMERGENCY_SAFETY', 'FAIL: reason_code 불일치!');
  console.assert(override1.required_approvals.length === 1, 'FAIL: required_approvals 불일치!');
  console.log('  PASS\n');

  // ============================================
  // TEST 2: 단일 승인 (SUPERVISOR)
  // ============================================
  console.log('--- TEST 2: 단일 승인 (SUPERVISOR) ---');
  const approved1 = await governance.approveOverride(override1.override_id, {
    role: 'SUPERVISOR',
    actor_id: 'supervisor-park',
    actor_kind: 'human',
    approved_at: new Date().toISOString(),
  });

  console.log('  status:', approved1.status);
  console.log('  approvals:', approved1.approvals.length);
  console.assert(approved1.status === 'APPROVED', 'FAIL: 1명 승인이면 APPROVED여야!');
  console.assert(approved1.approvals.length === 1, 'FAIL: 승인 1건이어야!');
  console.assert(approved1.approvals[0].role === 'SUPERVISOR', 'FAIL: 역할 불일치!');
  console.log('  PASS\n');

  // ============================================
  // TEST 3: 다중 승인 (Break-glass)
  // ============================================
  console.log('--- TEST 3: 다중 승인 (Break-glass: SUPERVISOR + COMPLIANCE) ---');
  const req3 = makeOverrideRequest({
    required_approvals: ['SUPERVISOR', 'COMPLIANCE'],
    reason_code: 'OPERATIONAL_NECESSITY',
    reason_text: 'Break-glass: 운항 정비 요건 미충족 상태에서 긴급 전이',
  });
  const override3 = await governance.createOverride(req3);
  console.log('  생성 status:', override3.status);
  console.assert(override3.status === 'PENDING_APPROVAL', 'FAIL: PENDING_APPROVAL이어야!');

  // 첫 번째 승인 — SUPERVISOR
  const partial = await governance.approveOverride(override3.override_id, {
    role: 'SUPERVISOR',
    actor_id: 'supervisor-park',
    actor_kind: 'human',
    approved_at: new Date().toISOString(),
  });
  console.log('  SUPERVISOR 승인 후 status:', partial.status);
  console.assert(partial.status === 'PENDING_APPROVAL', 'FAIL: 아직 PENDING이어야!');

  // 두 번째 승인 — COMPLIANCE
  const fullyApproved = await governance.approveOverride(override3.override_id, {
    role: 'COMPLIANCE',
    actor_id: 'compliance-lee',
    actor_kind: 'human',
    approved_at: new Date().toISOString(),
  });
  console.log('  COMPLIANCE 승인 후 status:', fullyApproved.status);
  console.assert(fullyApproved.status === 'APPROVED', 'FAIL: 모두 승인하면 APPROVED여야!');
  console.assert(fullyApproved.approvals.length === 2, 'FAIL: 승인 2건이어야!');
  console.log('  PASS\n');

  // ============================================
  // TEST 4: Override 거부
  // ============================================
  console.log('--- TEST 4: Override 거부 ---');
  const req4 = makeOverrideRequest({
    reason_code: 'OTHER',
    reason_text: '테스트 거부 케이스',
  });
  const override4 = await governance.createOverride(req4);
  const rejected = await governance.rejectOverride(
    override4.override_id,
    'compliance-lee',
    '사유 불충분'
  );

  console.log('  status:', rejected.status);
  console.assert(rejected.status === 'REJECTED', 'FAIL: REJECTED여야!');
  console.assert(rejected.resolved_at !== null, 'FAIL: resolved_at이 있어야!');
  console.log('  PASS\n');

  // ============================================
  // TEST 5: 실행 + Override Evidence Pack 자동 생성
  // ============================================
  console.log('--- TEST 5: 실행 + Override Evidence Pack 자동 생성 ---');
  const executed = await governance.executeOverride(override1.override_id);

  console.log('  status:', executed.status);
  console.log('  evidence_pack_id:', executed.evidence_pack_id);
  console.assert(executed.status === 'EXECUTED', 'FAIL: EXECUTED여야!');
  console.assert(executed.evidence_pack_id !== null, 'FAIL: Evidence Pack이 생성되어야!');

  // Evidence Pack이 실제 DB에 있는지 확인
  const pack = await packBuilder.getPack(executed.evidence_pack_id!);
  console.log('  pack exists:', pack !== null);
  console.log('  pack decision_id:', pack?.decision_id);
  console.assert(pack !== null, 'FAIL: Evidence Pack이 DB에 없음!');
  console.assert(pack!.decision_id.startsWith('OVERRIDE-'), 'FAIL: decision_id가 OVERRIDE-로 시작해야!');
  console.log('  PASS\n');

  // ============================================
  // TEST 6: KPI 조회
  // ============================================
  console.log('--- TEST 6: KPI 조회 ---');
  const kpis = await governance.getOverrideKpis(TENANT_ID);

  console.log('  total_count:', kpis.total_count);
  console.log('  by_status:', JSON.stringify(kpis.by_status));
  console.log('  by_reason_code:', JSON.stringify(kpis.by_reason_code));
  console.log('  avg_approval_minutes:', kpis.avg_approval_minutes);
  console.assert(kpis.total_count >= 3, 'FAIL: 최소 3건이어야!');
  console.assert(kpis.by_status['EXECUTED'] >= 1, 'FAIL: EXECUTED 1건 이상!');
  console.assert(kpis.by_status['REJECTED'] >= 1, 'FAIL: REJECTED 1건 이상!');
  console.assert(kpis.by_reason_code['EMERGENCY_SAFETY'] >= 1, 'FAIL: EMERGENCY_SAFETY 1건 이상!');
  console.log('  PASS\n');

  // ============================================
  // TEST 7: 만료된 Override 실행 불가
  // ============================================
  console.log('--- TEST 7: 만료된 Override 실행 불가 ---');
  // duration_minutes를 0으로 설정하여 즉시 만료되게 함
  const req7 = makeOverrideRequest({
    duration_minutes: 0,
    required_approvals: [],  // 승인 없이 바로 APPROVED
  });
  const override7 = await governance.createOverride(req7);
  console.log('  status:', override7.status, '(duration_minutes=0)');

  // 1초 대기 후 실행 시도
  await new Promise(r => setTimeout(r, 1100));

  let expiredError = false;
  try {
    await governance.executeOverride(override7.override_id);
  } catch (err: any) {
    expiredError = true;
    console.log('  예상된 에러:', err.message);
  }
  console.assert(expiredError === true, 'FAIL: 만료 에러 발생해야!');
  console.log('  PASS\n');

  // ============================================
  // TEST 8: 중복 실행 방지
  // ============================================
  console.log('--- TEST 8: 중복 실행 방지 ---');
  let duplicateError = false;
  try {
    await governance.executeOverride(override1.override_id);
  } catch (err: any) {
    duplicateError = true;
    console.log('  예상된 에러:', err.message);
  }
  console.assert(duplicateError === true, 'FAIL: 중복 실행 에러 발생해야!');
  console.log('  PASS\n');

  // ============================================
  // 결과 요약
  // ============================================
  console.log('==========================================');
  console.log('  모든 테스트 통과! Override Governance 정상 작동');
  console.log('==========================================');
  console.log(`\n  핵심 기능 검증:`);
  console.log(`    생성/승인/거부:        워크플로우 OK`);
  console.log(`    다중 승인 (Break-glass): 2명 필수 승인 OK`);
  console.log(`    Evidence Pack 자동 생성: Override 실행 시 OK`);
  console.log(`    KPI 추적:              건수/분포/평균시간 OK`);
  console.log(`    만료/중복 방지:        안전장치 OK`);
}

main().catch((err) => {
  console.error('\n테스트 실패:', err.message);
  process.exit(1);
});
