import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { PolicyEngine } from '../packages/policy-engine/src/engine';
import type { PolicyDefinition } from '../packages/policy-engine/src/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

function line() { console.log('-'.repeat(55)); }

async function main() {
  const engine = new PolicyEngine(supabase);

  console.log('\n');
  console.log('  ========================================');
  console.log('  NXTPrism Policy Engine Test');
  console.log('  "drone-flight-safety" policy');
  console.log('  ========================================\n');

  // ============================================
  // 1. 정책 배포 — 드론 비행 안전 정책
  // ============================================
  line();
  console.log('  TEST 1: 정책 배포\n');

  const flightPolicy: PolicyDefinition = {
    policy_id: 'drone-flight-safety',
    version: 'v1.0.0',
    name: 'Drone Flight Safety Policy',
    description: 'SOH, wind, visibility conditions for flight GO/NO-GO',
    scope: { asset_types: ['drone'] },
    rules: [
      {
        rule_id: 'R001',
        name: 'Battery SOH too low',
        priority: 0,
        condition: { operator: 'LT', field: 'input.battery_soh', value: 80 },
        action: { type: 'DENY', params: { reason: 'Battery SOH below 80%' } },
        evidence_requirements: ['BATTERY_SOH_CHECK'],
      },
      {
        rule_id: 'R002',
        name: 'High wind speed',
        priority: 1,
        condition: { operator: 'GT', field: 'input.wind_speed_kmh', value: 40 },
        action: { type: 'DENY', params: { reason: 'Wind speed exceeds 40 km/h' } },
        evidence_requirements: ['WEATHER_CHECK'],
      },
      {
        rule_id: 'R003',
        name: 'Moderate wind - requires approval',
        priority: 2,
        condition: {
          operator: 'AND',
          operands: [
            { operator: 'GT', field: 'input.wind_speed_kmh', value: 25 },
            { operator: 'LTE', field: 'input.wind_speed_kmh', value: 40 },
          ],
        },
        action: { type: 'REQUIRE_ATTESTATION' },
        attestation_requirements: ['FLIGHT_DISPATCHER'],
      },
      {
        rule_id: 'R004',
        name: 'Poor visibility',
        priority: 1,
        condition: { operator: 'EQ', field: 'input.visibility', value: 'POOR' },
        action: { type: 'DENY', params: { reason: 'Visibility is POOR' } },
      },
      {
        rule_id: 'R005',
        name: 'All conditions met',
        priority: 10,
        condition: {
          operator: 'AND',
          operands: [
            { operator: 'GTE', field: 'input.battery_soh', value: 80 },
            { operator: 'LTE', field: 'input.wind_speed_kmh', value: 25 },
            { operator: 'IN', field: 'input.visibility', value: ['GOOD', 'MODERATE'] },
          ],
        },
        action: { type: 'ALLOW' },
      },
    ],
    metadata: {
      created_at: new Date().toISOString(),
      created_by: 'admin',
      authority_profile: 'MOLIT',
      references: ['MOLIT-UAM-2026-001'],
    },
  };

  const published = await engine.publishPolicy(flightPolicy, 'admin');
  console.log(`  Policy published!`);
  console.log(`  ID: ${published.policy_version_id}`);
  console.log(`  ${published.policy_id} ${published.version}`);
  console.log(`  Rules: ${flightPolicy.rules.length}개\n`);

  // ============================================
  // 2. CASE A: 좋은 조건 — GO!
  // ============================================
  line();
  console.log('  TEST 2: CASE A — 좋은 조건');
  console.log('  Battery 94%, Wind 12km/h, Visibility GOOD\n');

  const resultA = await engine.evaluateByPolicyId('drone-flight-safety', {
    input: { battery_soh: 94, wind_speed_kmh: 12, visibility: 'GOOD' },
  });

  console.log(`  결과: ${resultA.allowed ? 'ALLOWED (GO!)' : 'DENIED (NO-GO)'}`);
  console.log(`  최종 액션: ${resultA.final_action}`);
  console.log(`  매치된 규칙: ${resultA.matched_rules.map(r => r.rule_id).join(', ')}`);
  console.assert(resultA.allowed === true, 'FAIL: should be allowed!');
  console.log('  PASS\n');

  // ============================================
  // 3. CASE B: 배터리 부족 — DENY!
  // ============================================
  line();
  console.log('  TEST 3: CASE B — 배터리 부족');
  console.log('  Battery 65%, Wind 10km/h, Visibility GOOD\n');

  const resultB = await engine.evaluateByPolicyId('drone-flight-safety', {
    input: { battery_soh: 65, wind_speed_kmh: 10, visibility: 'GOOD' },
  });

  console.log(`  결과: ${resultB.allowed ? 'ALLOWED' : 'DENIED (NO-GO!)'}`);
  console.log(`  최종 액션: ${resultB.final_action}`);
  console.log(`  매치된 규칙: ${resultB.matched_rules.map(r => `${r.rule_id}(${r.rule_name})`).join(', ')}`);
  console.assert(resultB.allowed === false, 'FAIL: should be denied!');
  console.assert(resultB.final_action === 'DENY', 'FAIL: should be DENY!');
  console.log('  PASS\n');

  // ============================================
  // 4. CASE C: 바람 강함 — DENY!
  // ============================================
  line();
  console.log('  TEST 4: CASE C — 강풍');
  console.log('  Battery 90%, Wind 55km/h, Visibility GOOD\n');

  const resultC = await engine.evaluateByPolicyId('drone-flight-safety', {
    input: { battery_soh: 90, wind_speed_kmh: 55, visibility: 'GOOD' },
  });

  console.log(`  결과: ${resultC.allowed ? 'ALLOWED' : 'DENIED (NO-GO!)'}`);
  console.log(`  최종 액션: ${resultC.final_action}`);
  console.log(`  사유: ${resultC.matched_rules.find(r => r.action.type === 'DENY')?.action.params?.reason}`);
  console.assert(resultC.allowed === false, 'FAIL!');
  console.log('  PASS\n');

  // ============================================
  // 5. CASE D: 중간 바람 — 승인 필요!
  // ============================================
  line();
  console.log('  TEST 5: CASE D — 중간 바람 (승인 필요)');
  console.log('  Battery 92%, Wind 30km/h, Visibility GOOD\n');

  const resultD = await engine.evaluateByPolicyId('drone-flight-safety', {
    input: { battery_soh: 92, wind_speed_kmh: 30, visibility: 'GOOD' },
  });

  console.log(`  결과: ${resultD.final_action}`);
  console.log(`  필요한 승인: ${resultD.attestation_requirements.join(', ')}`);
  console.assert(resultD.final_action === 'REQUIRE_ATTESTATION', 'FAIL!');
  console.log('  PASS\n');

  // ============================================
  // 6. CASE E: 복합 — 배터리 부족 + 시야 불량
  // ============================================
  line();
  console.log('  TEST 6: CASE E — 복합 위험');
  console.log('  Battery 70%, Wind 15km/h, Visibility POOR\n');

  const resultE = await engine.evaluateByPolicyId('drone-flight-safety', {
    input: { battery_soh: 70, wind_speed_kmh: 15, visibility: 'POOR' },
  });

  console.log(`  결과: ${resultE.allowed ? 'ALLOWED' : 'DENIED (NO-GO!)'}`);
  console.log(`  매치된 DENY 규칙 수: ${resultE.matched_rules.filter(r => r.action.type === 'DENY').length}개`);
  console.log(`  필요한 증거: ${resultE.evidence_requirements.join(', ')}`);
  console.assert(resultE.allowed === false, 'FAIL!');
  console.log('  PASS\n');

  // ============================================
  // 결과
  // ============================================
  console.log('  ========================================');
  console.log('  All 6 tests PASSED!');
  console.log('  ========================================\n');
}

main().catch((err) => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
