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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function line() {
  console.log('─'.repeat(55));
}

async function main() {
  const ledger = new EvidenceLedger(supabase);

  // 기존 데이터 정리
  await supabase.from('checkpoints').delete().eq('tenant_id', TENANT_ID);
  await supabase.from('evidence_records').delete().eq('tenant_id', TENANT_ID);

  console.log('\n');
  console.log('  ╔═══════════════════════════════════════════════╗');
  console.log('  ║   NXTPrism Demo — 드론 운항 시나리오          ║');
  console.log('  ║   "DRONE-001의 하루"                          ║');
  console.log('  ╚═══════════════════════════════════════════════╝');
  console.log('\n');
  await sleep(1000);

  // ============================================
  // SCENE 1: 아침 — 배터리 점검
  // ============================================
  line();
  console.log('  SCENE 1: 아침 08:00 — 배터리 점검');
  line();
  console.log('  정비사가 DRONE-001의 배터리 상태를 점검합니다.');
  console.log('  SOH(State of Health): 94.2%, 상태: 양호\n');
  await sleep(500);

  const ev1 = await ledger.appendEvidence({
    tenant_id: TENANT_ID,
    payload: {
      event_type: 'BATTERY_SOH_CHECK',
      asset_ref: { type: 'drone', id: 'DRONE-001' },
      inspector: 'TECH-Kim',
      result: { soh: 94.2, voltage: 48.1, cycles: 127, status: 'HEALTHY' },
      location: 'Incheon Vertiport A',
    },
    created_by: 'maintenance-system',
  });

  console.log('  -> 증거 기록됨!');
  console.log(`     증거 ID: ${ev1.evidence_id}`);
  console.log(`     체인 #${ev1.sequence_num}`);
  console.log(`     해시: ${ev1.chain_hash.slice(0, 40)}...`);
  console.log('');
  await sleep(1000);

  // ============================================
  // SCENE 2: 비행 계획 승인
  // ============================================
  line();
  console.log('  SCENE 2: 08:30 — 비행 계획 승인');
  line();
  console.log('  AI가 기상/배터리/경로를 분석하여 비행 가능 판단.');
  console.log('  운항 관리자 Park이 최종 승인.\n');
  await sleep(500);

  const ev2 = await ledger.appendEvidence({
    tenant_id: TENANT_ID,
    payload: {
      event_type: 'FLIGHT_PLAN_DECISION',
      asset_ref: { type: 'drone', id: 'DRONE-001' },
      decision: {
        outcome: 'GO',
        confidence: 0.97,
        factors: {
          weather: { wind_speed: 12, visibility: 'GOOD', rain: false },
          battery: { soh: 94.2, sufficient: true },
          route: { distance_km: 18.5, waypoints: 4, airspace_clear: true },
        },
      },
      approved_by: { name: 'Park', role: 'FLIGHT_DISPATCHER' },
    },
    decision_id: 'DEC-20260209-001',
    created_by: 'flight-ops-system',
  });

  console.log('  -> 증거 기록됨!');
  console.log(`     증거 ID: ${ev2.evidence_id}`);
  console.log(`     체인 #${ev2.sequence_num} (이전 해시와 연결됨)`);
  console.log(`     prev_hash: ${ev2.prev_hash.slice(0, 40)}...`);
  console.log(`     chain_hash: ${ev2.chain_hash.slice(0, 40)}...`);
  console.log('');
  await sleep(1000);

  // ============================================
  // SCENE 3: 비행 중 — 실시간 텔레메트리
  // ============================================
  line();
  console.log('  SCENE 3: 09:15 — 비행 중 텔레메트리 기록');
  line();
  console.log('  DRONE-001이 비행 중. 고도/속도/배터리 상태 기록.\n');
  await sleep(500);

  const ev3 = await ledger.appendEvidence({
    tenant_id: TENANT_ID,
    payload: {
      event_type: 'FLIGHT_TELEMETRY_SNAPSHOT',
      asset_ref: { type: 'drone', id: 'DRONE-001' },
      flight_id: 'FLT-20260209-001',
      snapshot: {
        altitude_m: 120,
        speed_kmh: 85,
        battery_pct: 78,
        gps: { lat: 37.4563, lng: 126.7052 },
        phase: 'CRUISE',
      },
    },
    created_by: 'telemetry-collector',
  });

  console.log('  -> 증거 기록됨!');
  console.log(`     체인 #${ev3.sequence_num}`);
  console.log('');
  await sleep(1000);

  // ============================================
  // SCENE 4: 착륙 후 — 정비 기록
  // ============================================
  line();
  console.log('  SCENE 4: 10:00 — 착륙 후 정비 기록');
  line();
  console.log('  비행 완료. 착륙 후 점검 수행.\n');
  await sleep(500);

  const ev4 = await ledger.appendEvidence({
    tenant_id: TENANT_ID,
    payload: {
      event_type: 'POST_FLIGHT_INSPECTION',
      asset_ref: { type: 'drone', id: 'DRONE-001' },
      flight_id: 'FLT-20260209-001',
      inspection: {
        battery_remaining_pct: 31,
        motor_temp_c: 42,
        frame_damage: false,
        propeller_condition: 'GOOD',
        overall: 'PASS',
      },
      inspector: 'TECH-Lee',
    },
    created_by: 'maintenance-system',
  });

  console.log('  -> 증거 기록됨!');
  console.log(`     체인 #${ev4.sequence_num}`);
  console.log('');
  await sleep(1000);

  // ============================================
  // 감사 시간! — 체인 검증
  // ============================================
  console.log('\n');
  console.log('  ╔═══════════════════════════════════════════════╗');
  console.log('  ║   감사관이 왔습니다!                          ║');
  console.log('  ║   "오늘 DRONE-001 기록 검증해주세요"          ║');
  console.log('  ╚═══════════════════════════════════════════════╝');
  console.log('');
  await sleep(1500);

  line();
  console.log('  VERIFY: 해시체인 무결성 검증 시작...');
  line();

  const result = await ledger.verifyChain(TENANT_ID);
  await sleep(1000);

  console.log(`\n  검증 결과: ${result.valid ? 'VALID (무결성 확인!)' : 'INVALID (변조 탐지!)'}`);
  console.log(`  검증한 레코드 수: ${result.records_checked}개`);
  console.log('');

  if (result.valid) {
    console.log('  체인 구조:');
    console.log('  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐');
    console.log('  │ #1 배터리 │───>│ #2 비행   │───>│ #3 텔레  │───>│ #4 정비  │');
    console.log('  │  점검    │    │  승인     │    │  메트리   │    │  기록    │');
    console.log('  └──────────┘    └──────────┘    └──────────┘    └──────────┘');
    console.log('     hash_A ──────> hash_B ──────> hash_C ──────> hash_D');
  }

  console.log('');
  await sleep(1000);

  // ============================================
  // Merkle 체크포인트
  // ============================================
  line();
  console.log('  CHECKPOINT: Merkle root로 봉인');
  line();
  console.log('  오늘의 모든 증거를 하나의 해시로 요약합니다.\n');
  await sleep(500);

  const cp = await ledger.createCheckpoint(TENANT_ID);

  console.log(`  체크포인트 ID: ${cp.checkpoint_id}`);
  console.log(`  범위: 증거 #${cp.sequence_from} ~ #${cp.sequence_to}`);
  console.log(`  포함 레코드: ${cp.record_count}개`);
  console.log(`  Merkle Root: ${cp.merkle_root.slice(0, 50)}...`);
  console.log('');
  console.log('  이 Merkle root 하나만 있으면 4개 증거 전체의');
  console.log('  무결성을 한 번에 증명할 수 있습니다.');

  console.log('\n');
  console.log('  ╔═══════════════════════════════════════════════╗');
  console.log('  ║   Demo 완료!                                  ║');
  console.log('  ╚═══════════════════════════════════════════════╝');
  console.log('');
}

main().catch((err) => {
  console.error('데모 실패:', err.message);
  process.exit(1);
});
