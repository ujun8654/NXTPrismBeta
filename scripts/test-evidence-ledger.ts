import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { EvidenceLedger } from '../packages/evidence-ledger/src/ledger';
import { GENESIS_HASH } from '../packages/evidence-ledger/src/hash';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function cleanup() {
  // 테스트 전 기존 데이터 정리
  await supabase.from('checkpoints').delete().eq('tenant_id', TENANT_ID);
  await supabase.from('evidence_records').delete().eq('tenant_id', TENANT_ID);
  console.log('기존 테스트 데이터 정리 완료\n');
}

async function main() {
  console.log('=== NXTPrism 해시체인 통합 테스트 ===\n');

  const ledger = new EvidenceLedger(supabase);

  // 0. 기존 데이터 정리
  await cleanup();

  // ============================================
  // TEST 1: 빈 체인 — 헤드가 없어야 함
  // ============================================
  console.log('--- TEST 1: 빈 체인 헤드 조회 ---');
  const emptyHead = await ledger.getChainHead(TENANT_ID);
  console.log('  빈 체인 헤드:', emptyHead);
  console.assert(emptyHead === null, 'FAIL: 빈 체인에 헤드가 있음!');
  console.log('  PASS\n');

  // ============================================
  // TEST 2: 첫 번째 증거 추가
  // ============================================
  console.log('--- TEST 2: 첫 번째 증거 추가 ---');
  const evidence1 = await ledger.appendEvidence({
    tenant_id: TENANT_ID,
    payload: {
      event_type: 'BATTERY_SOH_CHECK',
      asset_ref: { type: 'drone', id: 'DRONE-001' },
      result: { soh: 92.5, status: 'HEALTHY' },
    },
    created_by: 'test-script',
  });

  console.log('  evidence_id:', evidence1.evidence_id);
  console.log('  sequence_num:', evidence1.sequence_num);
  console.log('  prev_hash:', evidence1.prev_hash.slice(0, 30) + '...');
  console.log('  chain_hash:', evidence1.chain_hash.slice(0, 30) + '...');
  console.assert(evidence1.sequence_num === 1, 'FAIL: 첫 번째 sequence_num이 1이 아님!');
  console.assert(evidence1.prev_hash === GENESIS_HASH, 'FAIL: 첫 번째 prev_hash가 GENESIS가 아님!');
  console.log('  PASS\n');

  // ============================================
  // TEST 3: 두 번째 증거 추가 — 체인 연결 확인
  // ============================================
  console.log('--- TEST 3: 두 번째 증거 추가 (체인 연결) ---');
  const evidence2 = await ledger.appendEvidence({
    tenant_id: TENANT_ID,
    payload: {
      event_type: 'FLIGHT_PLAN_APPROVAL',
      asset_ref: { type: 'drone', id: 'DRONE-001' },
      result: { approved: true, route: 'A-B-C' },
    },
    decision_id: 'DEC-001',
    created_by: 'test-script',
  });

  console.log('  evidence_id:', evidence2.evidence_id);
  console.log('  sequence_num:', evidence2.sequence_num);
  console.log('  prev_hash:', evidence2.prev_hash.slice(0, 30) + '...');
  console.assert(evidence2.sequence_num === 2, 'FAIL: 두 번째 sequence_num이 2가 아님!');
  console.assert(evidence2.prev_hash === evidence1.chain_hash, 'FAIL: prev_hash가 이전 chain_hash와 불일치!');
  console.log('  PASS\n');

  // ============================================
  // TEST 4: 세 번째 증거 추가
  // ============================================
  console.log('--- TEST 4: 세 번째 증거 추가 ---');
  const evidence3 = await ledger.appendEvidence({
    tenant_id: TENANT_ID,
    payload: {
      event_type: 'MAINTENANCE_COMPLETE',
      asset_ref: { type: 'drone', id: 'DRONE-001' },
      result: { maintenance_type: 'SCHEDULED', technician: 'TECH-42' },
    },
    created_by: 'test-script',
  });

  console.log('  sequence_num:', evidence3.sequence_num);
  console.assert(evidence3.sequence_num === 3, 'FAIL: 세 번째 sequence_num이 3이 아님!');
  console.assert(evidence3.prev_hash === evidence2.chain_hash, 'FAIL: 체인 연결 불량!');
  console.log('  PASS\n');

  // ============================================
  // TEST 5: 체인 헤드 조회
  // ============================================
  console.log('--- TEST 5: 체인 헤드 조회 ---');
  const head = await ledger.getChainHead(TENANT_ID);
  console.log('  head sequence_num:', head?.sequence_num);
  console.log('  head chain_hash:', head?.chain_hash.slice(0, 30) + '...');
  console.assert(head !== null, 'FAIL: 체인 헤드가 null!');
  console.assert(head!.sequence_num === 3, 'FAIL: 헤드가 최신이 아님!');
  console.assert(head!.chain_hash === evidence3.chain_hash, 'FAIL: 헤드 해시 불일치!');
  console.log('  PASS\n');

  // ============================================
  // TEST 6: 증거 개별 조회
  // ============================================
  console.log('--- TEST 6: 증거 개별 조회 ---');
  const fetched = await ledger.getEvidence(evidence1.evidence_id);
  console.log('  조회된 evidence_id:', fetched?.evidence_id);
  console.assert(fetched !== null, 'FAIL: 증거 조회 실패!');
  console.assert(fetched!.evidence_id === evidence1.evidence_id, 'FAIL: ID 불일치!');
  console.assert(fetched!.payload.event_type === 'BATTERY_SOH_CHECK', 'FAIL: payload 불일치!');
  console.log('  PASS\n');

  // ============================================
  // TEST 7: 체인 무결성 검증 (정상)
  // ============================================
  console.log('--- TEST 7: 체인 무결성 검증 ---');
  const verifyResult = await ledger.verifyChain(TENANT_ID);
  console.log('  valid:', verifyResult.valid);
  console.log('  records_checked:', verifyResult.records_checked);
  console.assert(verifyResult.valid === true, 'FAIL: 체인 검증 실패!');
  console.assert(verifyResult.records_checked === 3, 'FAIL: 검증 레코드 수 불일치!');
  console.log('  PASS\n');

  // ============================================
  // TEST 8: 체크포인트 생성
  // ============================================
  console.log('--- TEST 8: Merkle 체크포인트 생성 ---');
  const checkpoint = await ledger.createCheckpoint(TENANT_ID);
  console.log('  checkpoint_id:', checkpoint.checkpoint_id);
  console.log('  sequence_from:', checkpoint.sequence_from);
  console.log('  sequence_to:', checkpoint.sequence_to);
  console.log('  merkle_root:', checkpoint.merkle_root.slice(0, 30) + '...');
  console.log('  record_count:', checkpoint.record_count);
  console.assert(checkpoint.sequence_from === 1, 'FAIL: 시작 시퀀스 불일치!');
  console.assert(checkpoint.sequence_to === 3, 'FAIL: 끝 시퀀스 불일치!');
  console.assert(checkpoint.record_count === 3, 'FAIL: 레코드 수 불일치!');
  console.log('  PASS\n');

  // ============================================
  // 결과 요약
  // ============================================
  console.log('==========================================');
  console.log('  모든 테스트 통과! 해시체인 정상 작동');
  console.log('==========================================');
  console.log('\n체인 구조:');
  console.log(`  [GENESIS] → #1 → #2 → #3`);
  console.log(`  Merkle checkpoint: seq 1~3, root=${checkpoint.merkle_root.slice(0, 20)}...`);
}

main().catch((err) => {
  console.error('\n테스트 실패:', err.message);
  process.exit(1);
});
