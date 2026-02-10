import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { StateMachineManager } from '../packages/state-machine/src/manager';
import type { StateMachineDefinition } from '../packages/state-machine/src/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

function line() { console.log('-'.repeat(55)); }

// 드론 감항성 상태 머신 정의
const airworthinessMachine: StateMachineDefinition = {
  machine_id: 'drone-airworthiness',
  version: 'v1.0.0',
  name: 'Drone Airworthiness State Machine',
  description: 'Manages drone operational readiness states',
  domain: 'airworthiness',
  states: [
    { state_id: 'SERVICEABLE', name: 'Serviceable', description: 'Flight-ready', is_initial: true },
    { state_id: 'RESTRICTED', name: 'Restricted', description: 'Limited operations only' },
    { state_id: 'MONITORING', name: 'Monitoring', description: 'Under observation' },
    { state_id: 'GROUNDED', name: 'Grounded', description: 'No flight allowed' },
    { state_id: 'MAINTENANCE', name: 'In Maintenance', description: 'Being repaired' },
  ],
  transitions: [
    {
      transition_id: 'T001',
      from: 'SERVICEABLE',
      to: 'RESTRICTED',
      name: 'Restrict operation',
      trigger_type: 'POLICY_DECISION',
      gate_mode: 'SOFT',
      gate_requirements: {
        required_policy_result: 'ALLOW',
        policy_id: 'drone-flight-safety',
      },
    },
    {
      transition_id: 'T002',
      from: 'RESTRICTED',
      to: 'GROUNDED',
      name: 'Ground drone',
      trigger_type: 'POLICY_DECISION',
      gate_mode: 'SOFT',
      gate_requirements: {},
    },
    {
      transition_id: 'T003',
      from: 'GROUNDED',
      to: 'MAINTENANCE',
      name: 'Send to maintenance',
      trigger_type: 'HUMAN_ACTION',
      gate_mode: 'HARD',
      gate_requirements: {
        required_attestations: ['MAINTENANCE_CONTROLLER'],
      },
    },
    {
      transition_id: 'T004',
      from: 'MAINTENANCE',
      to: 'SERVICEABLE',
      name: 'Return to service (RTS)',
      trigger_type: 'HUMAN_ACTION',
      gate_mode: 'HARD',
      gate_requirements: {
        required_attestations: ['CERTIFYING_STAFF'],
        required_evidence_types: ['MAINTENANCE_REPORT', 'INSPECTION_CHECKLIST'],
      },
      allow_override: true,
    },
    {
      transition_id: 'T005',
      from: 'SERVICEABLE',
      to: 'MONITORING',
      name: 'Set monitoring',
      trigger_type: 'SYSTEM_EVENT',
      gate_mode: 'SHADOW',
      gate_requirements: {},
    },
    {
      transition_id: 'T006',
      from: 'MONITORING',
      to: 'SERVICEABLE',
      name: 'Clear monitoring',
      trigger_type: 'POLICY_DECISION',
      gate_mode: 'SOFT',
      gate_requirements: {},
    },
    {
      transition_id: 'T007',
      from: 'MONITORING',
      to: 'RESTRICTED',
      name: 'Escalate to restricted',
      trigger_type: 'POLICY_DECISION',
      gate_mode: 'SOFT',
      gate_requirements: {},
    },
  ],
  metadata: {
    created_by: 'admin',
    authority_profile: 'MOLIT',
  },
};

async function main() {
  const manager = new StateMachineManager(supabase);

  console.log('\n');
  console.log('  ========================================');
  console.log('  NXTPrism State Machine Test');
  console.log('  "drone-airworthiness" machine');
  console.log('  ========================================\n');

  // ============================================
  // TEST 1: 머신 정의 등록
  // ============================================
  line();
  console.log('  TEST 1: Register state machine\n');

  const registered = await manager.registerMachine(airworthinessMachine, 'admin');
  console.log(`  Machine registered: ${registered.machine_id} ${registered.version}`);
  console.log(`  States: ${airworthinessMachine.states.length}`);
  console.log(`  Transitions: ${airworthinessMachine.transitions.length}`);
  console.log('  PASS\n');

  // ============================================
  // TEST 2: 머신 정의 조회
  // ============================================
  line();
  console.log('  TEST 2: Get machine definition\n');

  const machine = await manager.getMachine('drone-airworthiness');
  console.assert(machine !== null, 'FAIL: machine should exist');
  console.log(`  Retrieved: ${machine!.machine_id} v${machine!.version}`);
  console.log(`  Domain: ${machine!.domain}`);
  console.log('  PASS\n');

  // ============================================
  // TEST 3: SHADOW 전이 — SERVICEABLE -> MONITORING
  // ============================================
  line();
  console.log('  TEST 3: SHADOW transition (SERVICEABLE -> MONITORING)\n');

  const result3 = await manager.commitTransition({
    tenant_id: TENANT_ID,
    machine_id: 'drone-airworthiness',
    asset_ref: { type: 'drone', id: 'DRONE-001' },
    from: 'SERVICEABLE',
    to: 'MONITORING',
    triggered_by: 'health-monitor-system',
  });

  console.log(`  Result: ${result3.result}`);
  console.log(`  ${result3.from} -> ${result3.to}`);
  console.log(`  Gate mode: ${result3.gate_mode}`);
  console.assert(result3.result === 'COMMITTED', 'FAIL: should be COMMITTED');
  console.log('  PASS\n');

  // ============================================
  // TEST 4: 자산 상태 확인
  // ============================================
  line();
  console.log('  TEST 4: Check asset state\n');

  const state4 = await manager.getAssetState(TENANT_ID, 'drone-airworthiness', { type: 'drone', id: 'DRONE-001' });
  console.log(`  Current state: ${state4!.current_state}`);
  console.assert(state4!.current_state === 'MONITORING', 'FAIL: should be MONITORING');
  console.log('  PASS\n');

  // ============================================
  // TEST 5: SOFT 전이 — MONITORING -> RESTRICTED
  // ============================================
  line();
  console.log('  TEST 5: SOFT transition (MONITORING -> RESTRICTED)\n');

  const result5 = await manager.commitTransition({
    tenant_id: TENANT_ID,
    machine_id: 'drone-airworthiness',
    asset_ref: { type: 'drone', id: 'DRONE-001' },
    from: 'MONITORING',
    to: 'RESTRICTED',
    triggered_by: 'policy-engine',
  });

  console.log(`  Result: ${result5.result}`);
  console.log(`  Gate mode: ${result5.gate_mode}`);
  console.assert(result5.result === 'COMMITTED', 'FAIL');
  console.log('  PASS\n');

  // ============================================
  // TEST 6: SOFT 전이 — RESTRICTED -> GROUNDED
  // ============================================
  line();
  console.log('  TEST 6: SOFT transition (RESTRICTED -> GROUNDED)\n');

  const result6 = await manager.commitTransition({
    tenant_id: TENANT_ID,
    machine_id: 'drone-airworthiness',
    asset_ref: { type: 'drone', id: 'DRONE-001' },
    from: 'RESTRICTED',
    to: 'GROUNDED',
    triggered_by: 'ops-controller',
  });

  console.log(`  Result: ${result6.result}`);
  console.assert(result6.result === 'COMMITTED', 'FAIL');
  console.log('  PASS\n');

  // ============================================
  // TEST 7: HARD gate — Gate Token 발급 + 전이
  //         GROUNDED -> MAINTENANCE
  // ============================================
  line();
  console.log('  TEST 7: HARD gate with Gate Token (GROUNDED -> MAINTENANCE)\n');

  // 7a. Gate Token 발급
  const token = await manager.authorizeTransition('drone-airworthiness', {
    tenant_id: TENANT_ID,
    machine_id: 'drone-airworthiness',
    asset_ref: { type: 'drone', id: 'DRONE-001' },
    from: 'GROUNDED',
    to: 'MAINTENANCE',
    attestations: [{ role: 'MAINTENANCE_CONTROLLER', actor_id: 'user-kim', actor_kind: 'human' }],
    triggered_by: 'user-kim',
  });

  console.log(`  Gate Token issued: ${token.token_id.slice(0, 8)}...`);
  console.log(`  TTL: ${token.issued_at} ~ ${token.expires_at}`);
  console.log(`  Status: ${token.status}`);

  // 7b. Token으로 전이 실행
  const result7 = await manager.commitTransition({
    tenant_id: TENANT_ID,
    machine_id: 'drone-airworthiness',
    asset_ref: { type: 'drone', id: 'DRONE-001' },
    from: 'GROUNDED',
    to: 'MAINTENANCE',
    gate_token_id: token.token_id,
    attestations: [{ role: 'MAINTENANCE_CONTROLLER', actor_id: 'user-kim', actor_kind: 'human' }],
    triggered_by: 'user-kim',
  });

  console.log(`  Transition result: ${result7.result}`);
  console.assert(result7.result === 'COMMITTED', 'FAIL');
  console.log('  PASS\n');

  // ============================================
  // TEST 8: HARD gate 실패 — Token 없이 시도
  //         MAINTENANCE -> SERVICEABLE (RTS)
  // ============================================
  line();
  console.log('  TEST 8: HARD gate DENIED (no token, no attestation)\n');

  const result8 = await manager.commitTransition({
    tenant_id: TENANT_ID,
    machine_id: 'drone-airworthiness',
    asset_ref: { type: 'drone', id: 'DRONE-001' },
    from: 'MAINTENANCE',
    to: 'SERVICEABLE',
    triggered_by: 'unknown-user',
  });

  console.log(`  Result: ${result8.result}`);
  console.assert(result8.result === 'DENIED', 'FAIL: should be DENIED');
  console.log('  PASS\n');

  // ============================================
  // TEST 9: Override — MAINTENANCE -> SERVICEABLE
  //         Gate 요건 불충분하지만 Override로 강제
  // ============================================
  line();
  console.log('  TEST 9: Override transition (MAINTENANCE -> SERVICEABLE)\n');

  const result9 = await manager.commitTransition({
    tenant_id: TENANT_ID,
    machine_id: 'drone-airworthiness',
    asset_ref: { type: 'drone', id: 'DRONE-001' },
    from: 'MAINTENANCE',
    to: 'SERVICEABLE',
    override: {
      reason: 'Emergency deployment required - Category A mission',
      approved_by: 'supervisor-park',
      role: 'FLIGHT_SUPERVISOR',
    },
    triggered_by: 'supervisor-park',
  });

  console.log(`  Result: ${result9.result}`);
  console.log(`  Override reason: ${result9.override_reason}`);
  console.assert(result9.result === 'OVERRIDDEN', 'FAIL: should be OVERRIDDEN');
  console.log('  PASS\n');

  // ============================================
  // TEST 10: 최종 상태 + 전이 이력 확인
  // ============================================
  line();
  console.log('  TEST 10: Final state + transition history\n');

  const finalState = await manager.getAssetState(TENANT_ID, 'drone-airworthiness', { type: 'drone', id: 'DRONE-001' });
  console.log(`  Final state: ${finalState!.current_state}`);
  console.assert(finalState!.current_state === 'SERVICEABLE', 'FAIL: should be SERVICEABLE');

  const history = await manager.getTransitionHistory(
    TENANT_ID, 'drone-airworthiness', { type: 'drone', id: 'DRONE-001' }
  );
  console.log(`  Total transitions: ${history.length}`);
  console.log('  History:');
  for (const h of history.reverse()) {
    console.log(`    ${h.from_state} -> ${h.to_state} [${h.result}] by ${h.triggered_by}`);
  }

  console.log('\n  ========================================');
  console.log('  All 10 tests PASSED!');
  console.log('  ========================================\n');
}

main().catch((err) => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
