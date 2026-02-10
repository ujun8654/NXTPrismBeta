/**
 * NXTPrism Integrated Demo
 * ========================
 * 3개 엔진(Evidence Ledger + Policy Engine + State Machine)을
 * 하나의 드론 운영 시나리오로 연결하여 실행한다.
 *
 * 시나리오: DRONE-001의 하루
 * 1. 아침 비행 전 점검 → 정책 평가 (GO)
 * 2. 비행 중 이상 감지 → 상태 MONITORING으로 전이
 * 3. 상태 악화 → RESTRICTED → GROUNDED
 * 4. 정비 투입 → Gate Token으로 MAINTENANCE 전이
 * 5. 정비 완료 → Override로 긴급 복귀 (SERVICEABLE)
 * 6. 전체 증거 체인 검증 + 체크포인트 봉인
 * 7. Evidence Pack 조립 + 무결성 검증
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { EvidenceLedger } from '../packages/evidence-ledger/src/ledger';
import { PolicyEngine } from '../packages/policy-engine/src/engine';
import { StateMachineManager } from '../packages/state-machine/src/manager';
import { EvidencePackBuilder } from '../packages/evidence-pack/src/packer';
import type { PolicyDefinition } from '../packages/policy-engine/src/types';
import type { StateMachineDefinition } from '../packages/state-machine/src/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DRONE = { type: 'drone', id: 'DRONE-001' };

function banner(text: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${text}`);
  console.log('='.repeat(60));
}

function step(num: number, text: string) {
  console.log(`\n  ── SCENE ${num}: ${text} ──\n`);
}

async function cleanAll() {
  // 새로 추가된 테이블도 삭제
  const tables = [
    'asset_states', 'transition_records', 'gate_tokens', 'state_machines',
    'checkpoints', 'evidence_records', 'policy_versions', 'tenants',
  ];
  for (const table of tables) {
    await supabase.from(table).delete().neq(
      table === 'tenants' ? 'tenant_id' :
      table === 'state_machines' ? 'machine_id' :
      Object.keys((await supabase.from(table).select('*').limit(0)).data?.[0] || { id: '' })[0] || 'id',
      '00000000-0000-0000-0000-000000000000'
    );
  }
}

async function main() {
  const ledger = new EvidenceLedger(supabase);
  const policyEngine = new PolicyEngine(supabase);
  const sm = new StateMachineManager(supabase);
  const packBuilder = new EvidencePackBuilder(supabase);

  banner('NXTPrism Integrated Demo — DRONE-001의 하루');
  console.log('  Evidence Ledger + Policy Engine + State Machine');
  console.log('  3개 엔진 통합 시나리오\n');

  // ============================================
  // 0. 데이터 초기화
  // ============================================
  step(0, 'Reset — 모든 데이터 초기화');

  // 순서 중요: FK 의존성 때문에 자식부터 삭제
  await supabase.from('evidence_packs').delete().neq('tenant_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('asset_states').delete().neq('tenant_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('transition_records').delete().neq('tenant_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('gate_tokens').delete().neq('tenant_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('state_machines').delete().neq('machine_id', '___');
  await supabase.from('checkpoints').delete().neq('checkpoint_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('evidence_records').delete().neq('evidence_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('policy_versions').delete().neq('policy_version_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('tenants').delete().neq('tenant_id', '00000000-0000-0000-0000-000000000000');
  console.log('  All tables cleared.');

  // 테넌트 생성
  await supabase.from('tenants').insert({
    tenant_id: TENANT_ID,
    name: 'SkyLine UAM Corp.',
    isolation: 'row',
    locale: 'ko-KR',
  });
  console.log('  Tenant created: SkyLine UAM Corp.');

  // ============================================
  // 1. 정책 등록 + 상태 머신 등록
  // ============================================
  step(1, 'Setup — 정책 배포 + 상태 머신 등록');

  const flightPolicy: PolicyDefinition = {
    policy_id: 'drone-flight-safety',
    version: 'v1.0.0',
    name: 'Drone Flight Safety Policy',
    description: 'Battery, wind, visibility check for GO/NO-GO',
    scope: { asset_types: ['drone'] },
    rules: [
      {
        rule_id: 'R001', name: 'Battery SOH too low', priority: 0,
        condition: { operator: 'LT', field: 'input.battery_soh', value: 80 },
        action: { type: 'DENY', params: { reason: 'Battery SOH below 80%' } },
        evidence_requirements: ['BATTERY_SOH_CHECK'],
      },
      {
        rule_id: 'R002', name: 'High wind speed', priority: 1,
        condition: { operator: 'GT', field: 'input.wind_speed_kmh', value: 40 },
        action: { type: 'DENY', params: { reason: 'Wind exceeds 40 km/h' } },
        evidence_requirements: ['WEATHER_CHECK'],
      },
      {
        rule_id: 'R003', name: 'All conditions met', priority: 10,
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
    metadata: { created_at: new Date().toISOString(), created_by: 'admin', authority_profile: 'MOLIT' },
  };

  const publishedPolicy = await policyEngine.publishPolicy(flightPolicy, 'admin');
  console.log(`  Policy published: ${publishedPolicy.policy_id} ${publishedPolicy.version}`);

  const machine: StateMachineDefinition = {
    machine_id: 'drone-airworthiness',
    version: 'v1.0.0',
    name: 'Drone Airworthiness State Machine',
    domain: 'airworthiness',
    states: [
      { state_id: 'SERVICEABLE', name: 'Serviceable', is_initial: true },
      { state_id: 'MONITORING', name: 'Monitoring' },
      { state_id: 'RESTRICTED', name: 'Restricted' },
      { state_id: 'GROUNDED', name: 'Grounded' },
      { state_id: 'MAINTENANCE', name: 'In Maintenance' },
    ],
    transitions: [
      { transition_id: 'T001', from: 'SERVICEABLE', to: 'MONITORING', name: 'Set monitoring',
        trigger_type: 'SYSTEM_EVENT', gate_mode: 'SHADOW', gate_requirements: {} },
      { transition_id: 'T002', from: 'MONITORING', to: 'RESTRICTED', name: 'Escalate',
        trigger_type: 'POLICY_DECISION', gate_mode: 'SOFT', gate_requirements: {} },
      { transition_id: 'T003', from: 'RESTRICTED', to: 'GROUNDED', name: 'Ground',
        trigger_type: 'POLICY_DECISION', gate_mode: 'SOFT', gate_requirements: {} },
      { transition_id: 'T004', from: 'GROUNDED', to: 'MAINTENANCE', name: 'Send to MX',
        trigger_type: 'HUMAN_ACTION', gate_mode: 'HARD',
        gate_requirements: { required_attestations: ['MAINTENANCE_CONTROLLER'] } },
      { transition_id: 'T005', from: 'MAINTENANCE', to: 'SERVICEABLE', name: 'Return to Service',
        trigger_type: 'HUMAN_ACTION', gate_mode: 'HARD',
        gate_requirements: { required_attestations: ['CERTIFYING_STAFF'], required_evidence_types: ['MX_REPORT'] },
        allow_override: true },
    ],
  };

  await sm.registerMachine(machine, 'admin');
  console.log(`  State machine registered: ${machine.machine_id} (${machine.states.length} states, ${machine.transitions.length} transitions)`);

  // ============================================
  // 2. 아침 비행 전 점검 — 정책 평가 (GO!)
  // ============================================
  step(2, 'Morning Check — 비행 전 점검 (GO!)');

  const sensorData = { battery_soh: 94.2, wind_speed_kmh: 12, visibility: 'GOOD' };
  console.log(`  Sensor data: Battery ${sensorData.battery_soh}%, Wind ${sensorData.wind_speed_kmh}km/h, Visibility ${sensorData.visibility}`);

  const evalResult = policyEngine.evaluate(flightPolicy, { input: sensorData });
  console.log(`  Policy result: ${evalResult.allowed ? 'GO!' : 'NO-GO'} (${evalResult.final_action})`);
  console.log(`  Matched: ${evalResult.matched_rules.map(r => r.rule_id).join(', ')}`);

  // 증거 기록 #1 — 비행 전 점검 결과
  const ev1 = await ledger.appendEvidence({
    tenant_id: TENANT_ID,
    payload: {
      event_type: 'PRE_FLIGHT_CHECK',
      asset_ref: DRONE,
      sensor_data: sensorData,
      policy_evaluation: {
        policy_id: evalResult.policy_id,
        policy_version: evalResult.policy_version,
        allowed: evalResult.allowed,
        final_action: evalResult.final_action,
        matched_rules: evalResult.matched_rules.map(r => r.rule_id),
      },
    },
    decision_id: 'DEC-001-PREFLIGHT',
    policy_version_id: `${evalResult.policy_id}@${evalResult.policy_version}`,
    created_by: 'flight-ops-system',
  });
  console.log(`  Evidence #1 recorded: ${ev1.evidence_id.slice(0, 8)}... (seq: ${ev1.sequence_num})`);

  // ============================================
  // 3. 비행 중 이상 감지 → MONITORING
  // ============================================
  step(3, 'In-Flight Anomaly — 이상 감지, MONITORING 전이');

  const anomalyData = { battery_soh: 82.1, vibration_level: 'HIGH', temperature_c: 58 };
  console.log(`  Anomaly detected: Battery ${anomalyData.battery_soh}%, Vibration ${anomalyData.vibration_level}, Temp ${anomalyData.temperature_c}C`);

  const t1 = await sm.commitTransition({
    tenant_id: TENANT_ID,
    machine_id: 'drone-airworthiness',
    asset_ref: DRONE,
    from: 'SERVICEABLE',
    to: 'MONITORING',
    triggered_by: 'health-monitor-system',
  });
  console.log(`  Transition: SERVICEABLE -> MONITORING [${t1.result}]`);

  // 증거 기록 #2
  const ev2 = await ledger.appendEvidence({
    tenant_id: TENANT_ID,
    payload: {
      event_type: 'ANOMALY_DETECTED',
      asset_ref: DRONE,
      anomaly_data: anomalyData,
      state_transition: { from: 'SERVICEABLE', to: 'MONITORING', result: t1.result },
    },
    state_transition_id: t1.transition_record_id,
    created_by: 'health-monitor-system',
  });
  console.log(`  Evidence #2 recorded: ${ev2.evidence_id.slice(0, 8)}... (seq: ${ev2.sequence_num})`);

  // ============================================
  // 4. 상태 악화 → RESTRICTED → GROUNDED
  // ============================================
  step(4, 'Deterioration — RESTRICTED, GROUNDED 전이');

  // 정책 재평가 — 배터리 떨어짐
  const degradedData = { battery_soh: 72, wind_speed_kmh: 25, visibility: 'MODERATE' };
  const evalResult2 = policyEngine.evaluate(flightPolicy, { input: degradedData });
  console.log(`  Re-evaluation: Battery ${degradedData.battery_soh}% → ${evalResult2.allowed ? 'GO' : 'NO-GO'} (${evalResult2.final_action})`);

  // MONITORING → RESTRICTED
  const t2 = await sm.commitTransition({
    tenant_id: TENANT_ID, machine_id: 'drone-airworthiness', asset_ref: DRONE,
    from: 'MONITORING', to: 'RESTRICTED', triggered_by: 'policy-engine',
  });
  console.log(`  Transition: MONITORING -> RESTRICTED [${t2.result}]`);

  // RESTRICTED → GROUNDED
  const t3 = await sm.commitTransition({
    tenant_id: TENANT_ID, machine_id: 'drone-airworthiness', asset_ref: DRONE,
    from: 'RESTRICTED', to: 'GROUNDED', triggered_by: 'ops-controller-lee',
  });
  console.log(`  Transition: RESTRICTED -> GROUNDED [${t3.result}]`);

  // 증거 기록 #3
  const ev3 = await ledger.appendEvidence({
    tenant_id: TENANT_ID,
    payload: {
      event_type: 'DRONE_GROUNDED',
      asset_ref: DRONE,
      degraded_sensor: degradedData,
      policy_evaluation: {
        policy_id: evalResult2.policy_id,
        allowed: evalResult2.allowed,
        final_action: evalResult2.final_action,
      },
      transitions: [
        { from: 'MONITORING', to: 'RESTRICTED', result: t2.result },
        { from: 'RESTRICTED', to: 'GROUNDED', result: t3.result },
      ],
    },
    decision_id: 'DEC-002-GROUNDING',
    policy_version_id: `${evalResult2.policy_id}@${evalResult2.policy_version}`,
    created_by: 'ops-controller-lee',
  });
  console.log(`  Evidence #3 recorded: ${ev3.evidence_id.slice(0, 8)}... (seq: ${ev3.sequence_num})`);

  // ============================================
  // 5. 정비 투입 — HARD gate + Gate Token
  // ============================================
  step(5, 'Maintenance — Gate Token으로 정비 투입');

  const gateToken = await sm.authorizeTransition('drone-airworthiness', {
    tenant_id: TENANT_ID, machine_id: 'drone-airworthiness', asset_ref: DRONE,
    from: 'GROUNDED', to: 'MAINTENANCE',
    attestations: [{ role: 'MAINTENANCE_CONTROLLER', actor_id: 'user-kim', actor_kind: 'human' }],
    triggered_by: 'user-kim',
  });
  console.log(`  Gate Token issued: ${gateToken.token_id.slice(0, 8)}... (TTL 5min)`);

  const t4 = await sm.commitTransition({
    tenant_id: TENANT_ID, machine_id: 'drone-airworthiness', asset_ref: DRONE,
    from: 'GROUNDED', to: 'MAINTENANCE',
    gate_token_id: gateToken.token_id,
    attestations: [{ role: 'MAINTENANCE_CONTROLLER', actor_id: 'user-kim', actor_kind: 'human' }],
    triggered_by: 'user-kim',
  });
  console.log(`  Transition: GROUNDED -> MAINTENANCE [${t4.result}]`);

  // 증거 기록 #4
  const ev4 = await ledger.appendEvidence({
    tenant_id: TENANT_ID,
    payload: {
      event_type: 'MAINTENANCE_INITIATED',
      asset_ref: DRONE,
      gate_token: { token_id: gateToken.token_id, gate_mode: 'HARD' },
      attestation: { role: 'MAINTENANCE_CONTROLLER', actor: 'user-kim' },
      transition: { from: 'GROUNDED', to: 'MAINTENANCE', result: t4.result },
    },
    state_transition_id: t4.transition_record_id,
    created_by: 'user-kim',
  });
  console.log(`  Evidence #4 recorded: ${ev4.evidence_id.slice(0, 8)}... (seq: ${ev4.sequence_num})`);

  // ============================================
  // 6. 긴급 복귀 — Override (Break-glass)
  // ============================================
  step(6, 'Emergency RTS — Override로 긴급 복귀');

  console.log('  Situation: Category A mission requires DRONE-001 immediately');
  console.log('  Normal RTS requires: CERTIFYING_STAFF attestation + MX_REPORT');
  console.log('  Override: Supervisor Park authorizes emergency return');

  const t5 = await sm.commitTransition({
    tenant_id: TENANT_ID, machine_id: 'drone-airworthiness', asset_ref: DRONE,
    from: 'MAINTENANCE', to: 'SERVICEABLE',
    override: {
      reason: 'Category A emergency mission — full inspection to follow within 24h',
      approved_by: 'supervisor-park',
      role: 'FLIGHT_SUPERVISOR',
    },
    triggered_by: 'supervisor-park',
  });
  console.log(`  Transition: MAINTENANCE -> SERVICEABLE [${t5.result}]`);
  console.log(`  Override reason: ${t5.override_reason}`);

  // 증거 기록 #5 — Override 증거 (감사 핵심)
  const ev5 = await ledger.appendEvidence({
    tenant_id: TENANT_ID,
    payload: {
      event_type: 'OVERRIDE_RETURN_TO_SERVICE',
      asset_ref: DRONE,
      override: {
        reason: t5.override_reason,
        approved_by: 'supervisor-park',
        role: 'FLIGHT_SUPERVISOR',
        gate_bypassed: true,
      },
      transition: { from: 'MAINTENANCE', to: 'SERVICEABLE', result: t5.result },
      follow_up_required: 'Full inspection within 24 hours',
    },
    decision_id: 'DEC-003-OVERRIDE-RTS',
    state_transition_id: t5.transition_record_id,
    created_by: 'supervisor-park',
  });
  console.log(`  Evidence #5 recorded: ${ev5.evidence_id.slice(0, 8)}... (seq: ${ev5.sequence_num})`);

  // ============================================
  // 7. 최종 검증 — 체인 무결성 + 체크포인트
  // ============================================
  step(7, 'Audit — 체인 검증 + 체크포인트 봉인');

  // 자산 최종 상태
  const finalState = await sm.getAssetState(TENANT_ID, 'drone-airworthiness', DRONE);
  console.log(`  DRONE-001 final state: ${finalState!.current_state}`);

  // 전이 이력
  const history = await sm.getTransitionHistory(TENANT_ID, 'drone-airworthiness', DRONE);
  console.log(`  Transition history (${history.length} records):`);
  for (const h of [...history].reverse()) {
    const tag = h.result === 'OVERRIDDEN' ? ' ** OVERRIDE **' : '';
    console.log(`    ${h.from_state} -> ${h.to_state} [${h.result}] by ${h.triggered_by}${tag}`);
  }

  // 해시체인 검증
  const verification = await ledger.verifyChain(TENANT_ID);
  console.log(`\n  Chain verification: ${verification.valid ? 'VALID' : 'INVALID'}`);
  console.log(`  Records checked: ${verification.records_checked}`);

  // 머클 체크포인트
  const checkpoint = await ledger.createCheckpoint(TENANT_ID);
  console.log(`  Checkpoint created: ${checkpoint.checkpoint_id.slice(0, 8)}...`);
  console.log(`  Merkle root: ${checkpoint.merkle_root.slice(0, 40)}...`);
  console.log(`  Sealed records: ${checkpoint.sequence_from} ~ ${checkpoint.sequence_to} (${checkpoint.record_count} records)`);

  // ============================================
  // 8. Evidence Pack 조립 — 결정 증거 봉인
  // ============================================
  step(8, 'Evidence Pack — Override 결정 증거 봉인');

  const pack = await packBuilder.buildPack({
    tenant_id: TENANT_ID,
    decision: {
      decision_id: 'DEC-003-OVERRIDE-RTS',
      tenant_id: TENANT_ID,
      occurred_at: new Date().toISOString(),
      system: 'state-machine-engine',
      asset_ref: DRONE,
      outcome: { type: 'return_to_service', value: 'GO' },
    },
    context_refs: [
      {
        uri: `evidence://${ev5.evidence_id}`,
        hash: ev5.chain_hash,
        hash_alg: 'SHA-256',
        captured_at: ev5.created_at,
      },
    ],
    policy: {
      policy_id: 'drone-flight-safety',
      policy_version: 'v1.0.0',
      engine: 'deterministic-policy-engine',
      evaluation_result: { allowed: false, reasons: ['Battery SOH below 80%'] },
    },
    state_transition: {
      machine_id: 'drone-airworthiness',
      machine_version: 'v1.0.0',
      from: 'MAINTENANCE',
      to: 'SERVICEABLE',
      trigger: 'HUMAN_OVERRIDE',
      gate_mode: 'HARD',
    },
    attestations: [
      {
        type: 'HUMAN_OVERRIDE',
        actor: { kind: 'human', id: 'supervisor-park' },
        role: 'FLIGHT_SUPERVISOR',
        auth_context: { method: 'OIDC', idp: 'skyline-sso', mfa: true },
        signed_at: new Date().toISOString(),
        reason: 'Category A emergency mission — full inspection to follow within 24h',
      },
    ],
    integrity: {
      prev_hash: ev4.chain_hash,
      chain_hash: ev5.chain_hash,
      checkpoint_ref: checkpoint.checkpoint_id,
    },
    retention: {
      class: 'safety_critical',
      min_retention_days: 3650,
      deletion_strategy: 'NONE',
    },
    privacy: {
      pii_class: 'PII_NONE',
      data_residency: 'KR',
    },
    evidence_ids: [ev1.evidence_id, ev2.evidence_id, ev3.evidence_id, ev4.evidence_id, ev5.evidence_id],
  });

  console.log(`  Pack ID: ${pack.pack_id.slice(0, 8)}...`);
  console.log(`  Decision: ${pack.decision_id}`);
  console.log(`  Hash: ${pack.pack_hash.slice(0, 40)}...`);
  console.log(`  Evidence refs: ${pack.evidence_ids.length} records`);

  // 팩 무결성 검증
  const packVerify = packBuilder.verifyPack(pack.manifest, pack.pack_hash);
  console.log(`  Pack verification: ${packVerify.valid ? 'VALID' : 'INVALID'}`);

  // ============================================
  // Summary
  // ============================================
  banner('Demo Complete — Summary');

  console.log(`
  Tenant:          SkyLine UAM Corp.
  Asset:           DRONE-001

  Policy:          drone-flight-safety v1.0.0
  State Machine:   drone-airworthiness v1.0.0

  Evidence chain:  ${verification.records_checked} records (VALID)
  Checkpoint:      Merkle root sealed

  Timeline:
    1. Pre-flight check    → GO (Battery 94%, Wind 12km/h)
    2. Anomaly detected    → SERVICEABLE -> MONITORING
    3. Battery degraded    → MONITORING -> RESTRICTED -> GROUNDED
    4. Maintenance entry   → GROUNDED -> MAINTENANCE (Gate Token)
    5. Emergency override  → MAINTENANCE -> SERVICEABLE (Override)
    6. Chain verified      → All ${verification.records_checked} records intact
    7. Checkpoint sealed   → Merkle root created
    8. Evidence Pack       → Override 결정 봉인 (${packVerify.valid ? 'VERIFIED' : 'FAILED'})

  Supabase Tables:
    evidence_records:   ${verification.records_checked} records
    transition_records: ${history.length} records
    gate_tokens:        1 (USED)
    checkpoints:        1
    evidence_packs:     1 (Override RTS)
`);
}

main().catch((err) => {
  console.error('\nDemo failed:', err.message);
  process.exit(1);
});
