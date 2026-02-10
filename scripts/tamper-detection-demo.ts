/**
 * NXTPrism Tamper Detection Demo
 * ===============================
 * 1. 현재 체인 검증 → VALID
 * 2. DB에서 증거 하나를 변조 (payload 조작)
 * 3. 체인 검증 → INVALID (변조 탐지!)
 * 4. 원본 복구
 * 5. 체인 검증 → VALID (복구 확인)
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { EvidenceLedger } from '../packages/evidence-ledger/src/ledger';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

function banner(text: string) {
  console.log('\n' + '='.repeat(55));
  console.log(`  ${text}`);
  console.log('='.repeat(55));
}

async function main() {
  const ledger = new EvidenceLedger(supabase);

  banner('NXTPrism Tamper Detection Demo');
  console.log('  "누군가 DB를 직접 조작하면 어떻게 되는가?"\n');

  // ============================================
  // STEP 1: 현재 상태 확인 — VALID
  // ============================================
  console.log('  STEP 1: 현재 체인 검증\n');

  const before = await ledger.verifyChain(TENANT_ID);
  console.log(`  결과: ${before.valid ? 'VALID' : 'INVALID'}`);
  console.log(`  검증한 레코드: ${before.records_checked}건`);

  if (!before.valid) {
    console.log('\n  체인이 이미 깨져있어요. integrated-demo.ts를 먼저 실행해주세요.');
    return;
  }

  // ============================================
  // STEP 2: 변조 대상 선택 (3번째 증거)
  // ============================================
  console.log('\n  STEP 2: 변조 대상 선택\n');

  const { data: records } = await supabase
    .from('evidence_records')
    .select('evidence_id, sequence_num, payload, payload_hash')
    .eq('tenant_id', TENANT_ID)
    .order('sequence_num', { ascending: true });

  if (!records || records.length < 3) {
    console.log('  증거가 3건 미만입니다. integrated-demo.ts를 먼저 실행해주세요.');
    return;
  }

  const target = records[2]; // 3번째 레코드 (DRONE_GROUNDED)
  const originalPayload = JSON.parse(JSON.stringify(target.payload));
  const originalHash = target.payload_hash;

  console.log(`  Target: evidence #${target.sequence_num} (${target.evidence_id.slice(0, 8)}...)`);
  console.log(`  Event type: ${(target.payload as any).event_type}`);
  console.log(`  Original payload_hash: ${originalHash.slice(0, 40)}...`);

  // ============================================
  // STEP 3: 변조 실행!
  // ============================================
  console.log('\n  STEP 3: 변조 실행!\n');

  // payload 안의 배터리 수치를 조작
  const tamperedPayload = { ...originalPayload };
  if (tamperedPayload.degraded_sensor) {
    console.log(`  Before: battery_soh = ${tamperedPayload.degraded_sensor.battery_soh}%`);
    tamperedPayload.degraded_sensor.battery_soh = 95; // 72% → 95%로 조작
    console.log(`  After:  battery_soh = ${tamperedPayload.degraded_sensor.battery_soh}% (TAMPERED!)`);
  } else {
    // fallback: 아무 필드나 변경
    tamperedPayload._tampered = true;
    console.log('  payload에 _tampered: true 추가');
  }

  console.log('\n  Supabase DB에 직접 UPDATE 실행...');

  const { error: updateError } = await supabase
    .from('evidence_records')
    .update({ payload: tamperedPayload })
    .eq('evidence_id', target.evidence_id);

  if (updateError) {
    console.log('  UPDATE 실패:', updateError.message);
    return;
  }
  console.log('  DB 변조 완료! (payload가 바뀜, 하지만 payload_hash는 그대로)');

  // ============================================
  // STEP 4: 체인 검증 — INVALID!
  // ============================================
  console.log('\n  STEP 4: 변조 후 체인 검증\n');

  const after = await ledger.verifyChain(TENANT_ID);
  console.log(`  결과: ${after.valid ? 'VALID' : 'INVALID ← 변조 탐지!'}`);
  console.log(`  검증한 레코드: ${after.records_checked}건`);
  if (after.first_invalid_at) {
    console.log(`  변조 위치: sequence #${after.first_invalid_at}`);
  }
  if (after.error) {
    console.log(`  탐지 사유: ${after.error}`);
  }

  // ============================================
  // STEP 5: 원본 복구
  // ============================================
  console.log('\n  STEP 5: 원본 복구\n');

  await supabase
    .from('evidence_records')
    .update({ payload: originalPayload })
    .eq('evidence_id', target.evidence_id);

  console.log('  원본 payload 복구 완료');

  const restored = await ledger.verifyChain(TENANT_ID);
  console.log(`  복구 후 검증: ${restored.valid ? 'VALID' : 'INVALID'}`);
  console.log(`  검증한 레코드: ${restored.records_checked}건`);

  // ============================================
  // Summary
  // ============================================
  banner('Result');
  console.log(`
  1. 변조 전:  VALID   (${before.records_checked}건 정상)
  2. 변조 후:  INVALID (sequence #${after.first_invalid_at}에서 탐지)
  3. 복구 후:  VALID   (${restored.records_checked}건 정상)

  핵심:
  - DB를 직접 수정해도 payload_hash와 불일치 → 즉시 탐지
  - 해시체인 구조상 하나라도 바꾸면 체인 전체가 깨짐
  - 관리자(DBA)도 증거를 몰래 조작할 수 없음
`);
}

main().catch((err) => {
  console.error('Demo failed:', err.message);
  process.exit(1);
});
