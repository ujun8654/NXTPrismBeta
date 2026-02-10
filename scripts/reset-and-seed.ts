import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { EvidenceLedger } from '../packages/evidence-ledger/src/ledger';
import { PolicyEngine } from '../packages/policy-engine/src/engine';
import type { PolicyDefinition } from '../packages/policy-engine/src/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  const ledger = new EvidenceLedger(supabase);
  const policyEngine = new PolicyEngine(supabase);

  // ============================================
  // 1. 모든 테이블 데이터 삭제
  // ============================================
  console.log('=== 모든 데이터 삭제 ===\n');

  await supabase.from('checkpoints').delete().neq('checkpoint_id', '00000000-0000-0000-0000-000000000000');
  console.log('  checkpoints 삭제 완료');

  await supabase.from('evidence_records').delete().neq('evidence_id', '00000000-0000-0000-0000-000000000000');
  console.log('  evidence_records 삭제 완료');

  await supabase.from('policy_versions').delete().neq('policy_version_id', '00000000-0000-0000-0000-000000000000');
  console.log('  policy_versions 삭제 완료');

  await supabase.from('tenants').delete().neq('tenant_id', '00000000-0000-0000-0000-000000000000');
  console.log('  tenants 삭제 완료');

  console.log('\n=== 데이터 1건씩 삽입 ===\n');

  // ============================================
  // 2. tenants — 1건
  // ============================================
  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .insert({
      tenant_id: TENANT_ID,
      name: 'SkyLine UAM Corp.',
      isolation: 'row',
      locale: 'ko-KR',
    })
    .select()
    .single();

  if (tErr) throw new Error('tenant insert failed: ' + tErr.message);
  console.log('  [tenants] 1건 삽입');
  console.log(`    tenant_id: ${tenant.tenant_id}`);
  console.log(`    name: ${tenant.name}`);

  // ============================================
  // 3. policy_versions — 1건 (드론 비행 안전 정책)
  // ============================================
  const flightPolicy: PolicyDefinition = {
    policy_id: 'drone-flight-safety',
    version: 'v1.0.0',
    name: 'Drone Flight Safety Policy',
    description: 'Battery SOH, wind speed, visibility conditions for GO/NO-GO',
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
        action: { type: 'DENY', params: { reason: 'Wind exceeds 40 km/h' } },
        evidence_requirements: ['WEATHER_CHECK'],
      },
      {
        rule_id: 'R003',
        name: 'All clear',
        priority: 10,
        condition: {
          operator: 'AND',
          operands: [
            { operator: 'GTE', field: 'input.battery_soh', value: 80 },
            { operator: 'LTE', field: 'input.wind_speed_kmh', value: 40 },
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
    },
  };

  const policyRecord = await policyEngine.publishPolicy(flightPolicy, 'admin');
  console.log('\n  [policy_versions] 1건 삽입');
  console.log(`    policy_id: ${policyRecord.policy_id}`);
  console.log(`    version: ${policyRecord.version}`);
  console.log(`    name: ${policyRecord.name}`);

  // ============================================
  // 4. 정책 평가 실행
  // ============================================
  const evalResult = policyEngine.evaluate(flightPolicy, {
    input: { battery_soh: 94.2, wind_speed_kmh: 12, visibility: 'GOOD' },
  });

  console.log('\n  [policy evaluation]');
  console.log(`    result: ${evalResult.allowed ? 'ALLOWED (GO)' : 'DENIED (NO-GO)'}`);
  console.log(`    matched: ${evalResult.matched_rules.map(r => r.rule_id).join(', ')}`);

  // ============================================
  // 5. evidence_records — 1건 (정책 평가 결과 포함)
  // ============================================
  const evidence = await ledger.appendEvidence({
    tenant_id: TENANT_ID,
    payload: {
      event_type: 'FLIGHT_PLAN_DECISION',
      asset_ref: { type: 'drone', id: 'DRONE-001' },
      decision: {
        outcome: evalResult.allowed ? 'GO' : 'NO-GO',
        confidence: 0.97,
        factors: {
          battery: { soh: 94.2, sufficient: true },
          weather: { wind_speed_kmh: 12, visibility: 'GOOD', rain: false },
          route: { distance_km: 18.5, waypoints: 4 },
        },
      },
      policy_evaluation: {
        policy_id: evalResult.policy_id,
        policy_version: evalResult.policy_version,
        allowed: evalResult.allowed,
        final_action: evalResult.final_action,
      },
      approved_by: { name: 'Park', role: 'FLIGHT_DISPATCHER' },
    },
    decision_id: 'DEC-20260210-001',
    policy_version_id: `${policyRecord.policy_id}@${policyRecord.version}`,
    created_by: 'flight-ops-system',
  });

  console.log('\n  [evidence_records] 1건 삽입');
  console.log(`    evidence_id: ${evidence.evidence_id}`);
  console.log(`    sequence_num: ${evidence.sequence_num}`);
  console.log(`    decision_id: ${evidence.decision_id}`);
  console.log(`    policy_version_id: ${evidence.policy_version_id}`);
  console.log(`    chain_hash: ${evidence.chain_hash.slice(0, 50)}...`);

  // ============================================
  // 6. checkpoints — 1건
  // ============================================
  const checkpoint = await ledger.createCheckpoint(TENANT_ID);

  console.log('\n  [checkpoints] 1건 삽입');
  console.log(`    checkpoint_id: ${checkpoint.checkpoint_id}`);
  console.log(`    merkle_root: ${checkpoint.merkle_root.slice(0, 50)}...`);
  console.log(`    record_count: ${checkpoint.record_count}`);

  // ============================================
  // 결과 요약
  // ============================================
  console.log('\n=== 완료 ===\n');
  console.log('  tenants:          1건');
  console.log('  policy_versions:  1건');
  console.log('  evidence_records: 1건 (decision_id, policy_version_id 포함)');
  console.log('  checkpoints:      1건');
  console.log('\n  Supabase Dashboard에서 확인해보세요!');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
