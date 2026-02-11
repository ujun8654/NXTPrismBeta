/**
 * NXTPrism Dashboard Seed Script
 * ==============================
 * 대시보드 데모용 다양한 테스트 데이터를 API를 통해 삽입한다.
 *
 * 실행: npx tsx scripts/seed-dashboard-data.ts
 * (prism-api 서버가 localhost:3000에서 실행 중이어야 함)
 */

const API = 'http://localhost:3000';
const TENANT = '00000000-0000-0000-0000-000000000001';

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`  FAIL ${method} ${path}:`, err.error || res.statusText);
    return null;
  }
  return res.json();
}

function log(msg: string) { console.log(`  ${msg}`); }

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  NXTPrism Dashboard — Seed Data (확장판)');
  console.log('='.repeat(60));

  // ── 1. 증거 기록 (30건 — 다양한 이벤트 타입) ──
  console.log('\n── 1. Evidence Records (증거 기록 30건) ──\n');

  const evidencePayloads = [
    // ─ DRONE-001: 비행 → 이상 감지 → 착륙 시나리오 ─
    { payload: { event_type: 'PRE_FLIGHT_CHECK', asset_ref: { type: 'drone', id: 'DRONE-001' }, sensor_data: { battery_soh: 94.2, wind_speed_kmh: 12, visibility: 'GOOD' }, result: 'GO' }, decision_id: 'DEC-SEED-001', created_by: 'flight-ops-system' },
    { payload: { event_type: 'TAKEOFF', asset_ref: { type: 'drone', id: 'DRONE-001' }, waypoint: 'WP-ALPHA', altitude_m: 50, heading_deg: 270 }, created_by: 'flight-controller' },
    { payload: { event_type: 'SENSOR_READING', asset_ref: { type: 'drone', id: 'DRONE-001' }, temperature_c: 42, vibration_g: 1.2, altitude_m: 120, rpm_front: 5200, rpm_rear: 5180 }, created_by: 'telemetry-agent' },
    { payload: { event_type: 'SENSOR_READING', asset_ref: { type: 'drone', id: 'DRONE-001' }, temperature_c: 48, vibration_g: 1.8, altitude_m: 115, rpm_front: 5350, rpm_rear: 4900 }, created_by: 'telemetry-agent' },
    { payload: { event_type: 'ANOMALY_DETECTED', asset_ref: { type: 'drone', id: 'DRONE-001' }, anomaly: { type: 'VIBRATION_HIGH', threshold: 1.5, actual: 2.1, severity: 'WARNING' } }, decision_id: 'DEC-SEED-002', created_by: 'health-monitor' },
    { payload: { event_type: 'GEOFENCE_ALERT', asset_ref: { type: 'drone', id: 'DRONE-001' }, zone: 'RESTRICTED_AREA_A', distance_m: 50, action: 'RTH_TRIGGERED' }, created_by: 'geofence-monitor' },
    { payload: { event_type: 'LANDING_COMPLETE', asset_ref: { type: 'drone', id: 'DRONE-001' }, flight_time_min: 28, distance_km: 4.2, landing_accuracy_m: 0.3, battery_remaining: 38 }, decision_id: 'DEC-SEED-003', created_by: 'flight-controller' },

    // ─ DRONE-002: 정상 비행 + 정책 평가 NO-GO ─
    { payload: { event_type: 'PRE_FLIGHT_CHECK', asset_ref: { type: 'drone', id: 'DRONE-002' }, sensor_data: { battery_soh: 88.5, wind_speed_kmh: 8, visibility: 'GOOD' }, result: 'GO' }, decision_id: 'DEC-SEED-004', created_by: 'flight-ops-system' },
    { payload: { event_type: 'TAKEOFF', asset_ref: { type: 'drone', id: 'DRONE-002' }, waypoint: 'WP-BRAVO', altitude_m: 80, heading_deg: 90 }, created_by: 'flight-controller' },
    { payload: { event_type: 'SENSOR_READING', asset_ref: { type: 'drone', id: 'DRONE-002' }, temperature_c: 35, vibration_g: 0.8, altitude_m: 80, battery_v: 22.1 }, created_by: 'telemetry-agent' },
    { payload: { event_type: 'LANDING_COMPLETE', asset_ref: { type: 'drone', id: 'DRONE-002' }, flight_time_min: 15, distance_km: 2.1, landing_accuracy_m: 0.5, battery_remaining: 62 }, created_by: 'flight-controller' },
    { payload: { event_type: 'POLICY_EVALUATION', asset_ref: { type: 'drone', id: 'DRONE-002' }, policy_id: 'drone-flight-safety', result: 'NO-GO', reason: 'Battery SOH below 90% threshold' }, decision_id: 'DEC-SEED-005', created_by: 'policy-engine' },

    // ─ DRONE-003: 정비 완료 + 정상 비행 ─
    { payload: { event_type: 'MAINTENANCE_LOG', asset_ref: { type: 'drone', id: 'DRONE-003' }, action: 'BATTERY_REPLACEMENT', technician: 'tech-park', parts: ['BAT-LI-2200'], duration_min: 45 }, created_by: 'mx-system' },
    { payload: { event_type: 'PRE_FLIGHT_CHECK', asset_ref: { type: 'drone', id: 'DRONE-003' }, sensor_data: { battery_soh: 97.0, wind_speed_kmh: 5, visibility: 'GOOD' }, result: 'GO' }, decision_id: 'DEC-SEED-006', created_by: 'flight-ops-system' },
    { payload: { event_type: 'SENSOR_READING', asset_ref: { type: 'drone', id: 'DRONE-003' }, temperature_c: 30, vibration_g: 0.4, altitude_m: 100, battery_v: 24.8 }, created_by: 'telemetry-agent' },

    // ─ DRONE-004: 긴급 착륙 시나리오 ─
    { payload: { event_type: 'PRE_FLIGHT_CHECK', asset_ref: { type: 'drone', id: 'DRONE-004' }, sensor_data: { battery_soh: 91.0, wind_speed_kmh: 18, visibility: 'MODERATE' }, result: 'GO' }, decision_id: 'DEC-SEED-007', created_by: 'flight-ops-system' },
    { payload: { event_type: 'ANOMALY_DETECTED', asset_ref: { type: 'drone', id: 'DRONE-004' }, anomaly: { type: 'GPS_DRIFT', threshold: 2.0, actual: 5.7, severity: 'CRITICAL' } }, decision_id: 'DEC-SEED-008', created_by: 'nav-monitor' },
    { payload: { event_type: 'EMERGENCY_LANDING', asset_ref: { type: 'drone', id: 'DRONE-004' }, reason: 'GPS_SIGNAL_LOSS', landing_type: 'CONTROLLED', coordinates: { lat: 37.5665, lng: 126.978 } }, decision_id: 'DEC-SEED-009', created_by: 'flight-controller' },
    { payload: { event_type: 'MAINTENANCE_LOG', asset_ref: { type: 'drone', id: 'DRONE-004' }, action: 'GPS_MODULE_REPLACEMENT', technician: 'tech-kim', parts: ['GPS-M9N-V2'], duration_min: 90 }, created_by: 'mx-system' },

    // ─ DRONE-005: 장거리 비행 + 기상 변화 ─
    { payload: { event_type: 'PRE_FLIGHT_CHECK', asset_ref: { type: 'drone', id: 'DRONE-005' }, sensor_data: { battery_soh: 95.5, wind_speed_kmh: 10, visibility: 'GOOD' }, result: 'GO' }, decision_id: 'DEC-SEED-010', created_by: 'flight-ops-system' },
    { payload: { event_type: 'SENSOR_READING', asset_ref: { type: 'drone', id: 'DRONE-005' }, temperature_c: 22, vibration_g: 0.6, altitude_m: 150, wind_gust_kmh: 35 }, created_by: 'telemetry-agent' },
    { payload: { event_type: 'POLICY_EVALUATION', asset_ref: { type: 'drone', id: 'DRONE-005' }, policy_id: 'weather-limits', result: 'NO-GO', reason: 'Wind gust 35km/h exceeds 30km/h limit' }, decision_id: 'DEC-SEED-011', created_by: 'policy-engine' },

    // ─ DRONE-006: 배터리 퇴화 모니터링 ─
    { payload: { event_type: 'PRE_FLIGHT_CHECK', asset_ref: { type: 'drone', id: 'DRONE-006' }, sensor_data: { battery_soh: 72.3, wind_speed_kmh: 6, visibility: 'GOOD' }, result: 'NO-GO' }, decision_id: 'DEC-SEED-012', created_by: 'flight-ops-system' },
    { payload: { event_type: 'ANOMALY_DETECTED', asset_ref: { type: 'drone', id: 'DRONE-006' }, anomaly: { type: 'BATTERY_DEGRADATION', threshold: 80, actual: 72.3, severity: 'WARNING' } }, created_by: 'health-monitor' },

    // ─ 기상 관측소 + 시스템 이벤트 ─
    { payload: { event_type: 'SENSOR_READING', asset_ref: { type: 'sensor', id: 'WX-STATION-01' }, weather: { temp_c: 18, humidity: 65, wind_kmh: 22, pressure_hpa: 1013, ceiling_ft: 3500 } }, created_by: 'wx-collector' },
    { payload: { event_type: 'SENSOR_READING', asset_ref: { type: 'sensor', id: 'WX-STATION-02' }, weather: { temp_c: 15, humidity: 78, wind_kmh: 28, pressure_hpa: 1008, ceiling_ft: 2000 } }, created_by: 'wx-collector' },
    { payload: { event_type: 'SYSTEM_AUDIT', action: 'PERIODIC_INTEGRITY_CHECK', checker: 'audit-daemon', result: 'PASS', records_checked: 500 }, created_by: 'audit-daemon' },
    { payload: { event_type: 'REGULATORY_REPORT', authority: 'MOLIT', report_type: 'MONTHLY_SAFETY', period: '2026-01', compliance_score: 98.5 }, created_by: 'compliance-officer' },
    { payload: { event_type: 'FLEET_SUMMARY', total_flights: 142, total_distance_km: 856, avg_flight_time_min: 22, incidents: 2, safety_score: 96.2 }, created_by: 'fleet-analytics' },
  ];

  for (const ev of evidencePayloads) {
    const r = await api('POST', '/v1/evidence/create', { tenant_id: TENANT, ...ev });
    if (r) log(`Evidence #${r.sequence_num}: ${ev.payload.event_type} [${(ev.payload as any).asset_ref?.id || 'system'}]`);
  }

  // ── 2. 1차 체크포인트 ──
  console.log('\n── 2. Checkpoint #1 ──\n');
  const cp1 = await api('POST', `/v1/chains/${TENANT}/checkpoint`);
  if (cp1) log(`Checkpoint #1: seq ${cp1.sequence_from}-${cp1.sequence_to}, ${cp1.record_count} records`);

  // ── 3. 상태 머신 등록 ──
  console.log('\n── 3. State Machine (상태 머신 등록) ──\n');

  const machineDefinition = {
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
      { state_id: 'DECOMMISSIONED', name: 'Decommissioned' },
    ],
    transitions: [
      { transition_id: 'T001', from: 'SERVICEABLE', to: 'MONITORING', name: 'Set monitoring', trigger_type: 'SYSTEM_EVENT', gate_mode: 'SHADOW', gate_requirements: {} },
      { transition_id: 'T002', from: 'MONITORING', to: 'RESTRICTED', name: 'Escalate', trigger_type: 'POLICY_DECISION', gate_mode: 'SOFT', gate_requirements: {} },
      { transition_id: 'T003', from: 'RESTRICTED', to: 'GROUNDED', name: 'Ground', trigger_type: 'POLICY_DECISION', gate_mode: 'SOFT', gate_requirements: {} },
      { transition_id: 'T004', from: 'GROUNDED', to: 'MAINTENANCE', name: 'Send to MX', trigger_type: 'HUMAN_ACTION', gate_mode: 'HARD', gate_requirements: { required_attestations: ['MAINTENANCE_CONTROLLER'] } },
      { transition_id: 'T005', from: 'MAINTENANCE', to: 'SERVICEABLE', name: 'Return to Service', trigger_type: 'HUMAN_ACTION', gate_mode: 'HARD', gate_requirements: { required_attestations: ['CERTIFYING_STAFF'] }, allow_override: true },
      { transition_id: 'T006', from: 'MONITORING', to: 'SERVICEABLE', name: 'Clear monitoring', trigger_type: 'SYSTEM_EVENT', gate_mode: 'SHADOW', gate_requirements: {} },
    ],
  };

  const sm = await api('POST', '/v1/state-machines/register', { definition: machineDefinition, registered_by: 'admin' });
  if (sm) log(`Machine registered: ${machineDefinition.machine_id}`);
  else log('Machine already exists (OK)');

  // ── 4. 드론 6대 상태 전이 ──
  console.log('\n── 4. State Transitions (6대 드론 상태 전이) ──\n');

  // 공통 함수
  async function transition(droneId: string, from: string, to: string, by: string) {
    const r = await api('POST', '/v1/state-machines/drone-airworthiness/transitions/commit', {
      tenant_id: TENANT, machine_id: 'drone-airworthiness',
      asset_ref: { type: 'drone', id: droneId },
      from, to, triggered_by: by,
    });
    if (r) log(`${droneId}: ${from} → ${to} [${r.result}]`);
    return r;
  }

  // DRONE-001: SERVICEABLE → MONITORING → RESTRICTED → GROUNDED (심각)
  await transition('DRONE-001', 'SERVICEABLE', 'MONITORING', 'health-monitor');
  await transition('DRONE-001', 'MONITORING', 'RESTRICTED', 'policy-engine');
  await transition('DRONE-001', 'RESTRICTED', 'GROUNDED', 'ops-controller-lee');

  // DRONE-002: SERVICEABLE → MONITORING (경미한 이상)
  await transition('DRONE-002', 'SERVICEABLE', 'MONITORING', 'health-monitor');

  // DRONE-003: SERVICEABLE 유지 (정상)
  log('DRONE-003: SERVICEABLE (정상 — 전이 없음)');

  // DRONE-004: SERVICEABLE → MONITORING → RESTRICTED (GPS 문제)
  await transition('DRONE-004', 'SERVICEABLE', 'MONITORING', 'nav-monitor');
  await transition('DRONE-004', 'MONITORING', 'RESTRICTED', 'policy-engine');

  // DRONE-005: SERVICEABLE → MONITORING (기상 경고)
  await transition('DRONE-005', 'SERVICEABLE', 'MONITORING', 'wx-monitor');

  // DRONE-006: SERVICEABLE → MONITORING → RESTRICTED → GROUNDED (배터리 퇴화)
  await transition('DRONE-006', 'SERVICEABLE', 'MONITORING', 'health-monitor');
  await transition('DRONE-006', 'MONITORING', 'RESTRICTED', 'policy-engine');
  await transition('DRONE-006', 'RESTRICTED', 'GROUNDED', 'ops-controller-lee');

  // ── 5. Override 6건 ──
  console.log('\n── 5. Override Governance (6건) ──\n');

  // Override 1: 긴급 안전 — EXECUTED (2명 승인)
  const ov1 = await api('POST', '/v1/overrides/create', {
    tenant_id: TENANT, reason_code: 'EMERGENCY_SAFETY',
    reason_text: 'DRONE-001 긴급 안전 점검 완료, 즉시 정비동 이동 필요',
    impact_scope: 'single_asset', duration_minutes: 60,
    machine_id: 'drone-airworthiness', asset_ref: { type: 'drone', id: 'DRONE-001' },
    from_state: 'GROUNDED', to_state: 'MAINTENANCE',
    required_approvals: [{ role: 'SAFETY_OFFICER' }, { role: 'OPS_MANAGER' }],
    requested_by: 'ops-controller-lee',
  });
  if (ov1) {
    log(`Override #1: ${ov1.override_id.slice(0, 8)}... [EMERGENCY_SAFETY]`);
    await api('POST', `/v1/overrides/${ov1.override_id}/approve`, { role: 'SAFETY_OFFICER', actor_id: 'safety-kim' });
    await api('POST', `/v1/overrides/${ov1.override_id}/approve`, { role: 'OPS_MANAGER', actor_id: 'mgr-park' });
    log('  → 2명 승인 완료');
  }

  // Override 2: 정비 대기 — PENDING_APPROVAL
  const ov2 = await api('POST', '/v1/overrides/create', {
    tenant_id: TENANT, reason_code: 'MAINTENANCE_REQUIRED',
    reason_text: 'DRONE-002 모터 교체 대기 중, 제한적 운용 요청',
    impact_scope: 'single_asset', duration_minutes: 120,
    machine_id: 'drone-airworthiness', asset_ref: { type: 'drone', id: 'DRONE-002' },
    from_state: 'MONITORING', to_state: 'SERVICEABLE',
    required_approvals: [{ role: 'SAFETY_OFFICER' }],
    requested_by: 'tech-choi',
  });
  if (ov2) log(`Override #2: ${ov2.override_id.slice(0, 8)}... [MAINTENANCE_REQUIRED] — 승인 대기`);

  // Override 3: 운영 필요 — REJECTED
  const ov3 = await api('POST', '/v1/overrides/create', {
    tenant_id: TENANT, reason_code: 'OPERATIONAL_NECESSITY',
    reason_text: '야간 배송 스케줄로 인한 비행 시간 연장 요청',
    impact_scope: 'fleet', duration_minutes: 180,
    machine_id: 'drone-airworthiness', asset_ref: { type: 'drone', id: 'DRONE-003' },
    from_state: 'SERVICEABLE', to_state: 'MONITORING',
    required_approvals: [{ role: 'OPS_MANAGER' }],
    requested_by: 'dispatcher-jung',
  });
  if (ov3) {
    await api('POST', `/v1/overrides/${ov3.override_id}/reject`, { actor_id: 'mgr-park', reason: '야간 비행 기상 조건 미충족' });
    log(`Override #3: ${ov3.override_id.slice(0, 8)}... [OPERATIONAL_NECESSITY] — 거부됨`);
  }

  // Override 4: GPS 이상 드론 복귀 — PENDING_APPROVAL (1명 승인 대기)
  const ov4 = await api('POST', '/v1/overrides/create', {
    tenant_id: TENANT, reason_code: 'EMERGENCY_SAFETY',
    reason_text: 'DRONE-004 GPS 모듈 교체 완료, RESTRICTED → MONITORING 복귀 요청',
    impact_scope: 'single_asset', duration_minutes: 30,
    machine_id: 'drone-airworthiness', asset_ref: { type: 'drone', id: 'DRONE-004' },
    from_state: 'RESTRICTED', to_state: 'MONITORING',
    required_approvals: [{ role: 'SAFETY_OFFICER' }, { role: 'MAINTENANCE_CONTROLLER' }],
    requested_by: 'tech-kim',
  });
  if (ov4) {
    await api('POST', `/v1/overrides/${ov4.override_id}/approve`, { role: 'MAINTENANCE_CONTROLLER', actor_id: 'mx-chief-oh' });
    log(`Override #4: ${ov4.override_id.slice(0, 8)}... [EMERGENCY_SAFETY] — 1/2 승인 (대기 중)`);
  }

  // Override 5: 배터리 교체 후 복귀 — EXECUTED
  const ov5 = await api('POST', '/v1/overrides/create', {
    tenant_id: TENANT, reason_code: 'MAINTENANCE_REQUIRED',
    reason_text: 'DRONE-006 배터리 교체 후 비행 적합성 확인, 정비 투입 요청',
    impact_scope: 'single_asset', duration_minutes: 90,
    machine_id: 'drone-airworthiness', asset_ref: { type: 'drone', id: 'DRONE-006' },
    from_state: 'GROUNDED', to_state: 'MAINTENANCE',
    required_approvals: [{ role: 'SAFETY_OFFICER' }],
    requested_by: 'mx-chief-oh',
  });
  if (ov5) {
    await api('POST', `/v1/overrides/${ov5.override_id}/approve`, { role: 'SAFETY_OFFICER', actor_id: 'safety-kim' });
    log(`Override #5: ${ov5.override_id.slice(0, 8)}... [MAINTENANCE_REQUIRED] — 승인 완료`);
  }

  // Override 6: 기상 해제 비행 재개 — REJECTED
  const ov6 = await api('POST', '/v1/overrides/create', {
    tenant_id: TENANT, reason_code: 'OPERATIONAL_NECESSITY',
    reason_text: 'DRONE-005 기상 악화 해제 전 긴급 배송 비행 재개 요청',
    impact_scope: 'single_asset', duration_minutes: 45,
    machine_id: 'drone-airworthiness', asset_ref: { type: 'drone', id: 'DRONE-005' },
    from_state: 'MONITORING', to_state: 'SERVICEABLE',
    required_approvals: [{ role: 'SAFETY_OFFICER' }, { role: 'OPS_MANAGER' }],
    requested_by: 'dispatcher-jung',
  });
  if (ov6) {
    await api('POST', `/v1/overrides/${ov6.override_id}/reject`, { actor_id: 'safety-kim', reason: '기상 경보 아직 해제되지 않음, 돌풍 35km/h 지속' });
    log(`Override #6: ${ov6.override_id.slice(0, 8)}... [OPERATIONAL_NECESSITY] — 거부됨`);
  }

  // ── 6. 감사 보고서 (5종) ──
  console.log('\n── 6. Audit Reports (감사 보고서 5건) ──\n');

  const reports = [
    { name: 'AUDIT_REPORT', path: '/v1/exports/audit-report' },
    { name: 'CHAIN_AUDIT', path: '/v1/exports/chain-audit' },
    { name: 'COMPLIANCE', path: '/v1/exports/compliance-snapshot' },
    { name: 'OVERRIDE', path: '/v1/exports/override-history' },
  ];

  for (const rpt of reports) {
    const r = await api('POST', rpt.path, { tenant_id: TENANT, requested_by: 'seed-script' });
    if (r) log(`${rpt.name}: export_id ${r.export_id?.slice(0, 8)}...`);
  }

  // 2번째 감사 보고서 세트 (시간 차이 데모용)
  for (const rpt of reports) {
    const r = await api('POST', rpt.path, { tenant_id: TENANT, requested_by: 'compliance-officer' });
    if (r) log(`${rpt.name} (2nd): export_id ${r.export_id?.slice(0, 8)}...`);
  }

  // ── 7. 추가 증거 + 2차/3차 체크포인트 ──
  console.log('\n── 7. Additional Evidence + Checkpoints ──\n');

  const additionalEvidence = [
    { payload: { event_type: 'SYSTEM_AUDIT', action: 'PERIODIC_INTEGRITY_CHECK', checker: 'audit-daemon', result: 'PASS', records_checked: 800 }, created_by: 'audit-daemon' },
    { payload: { event_type: 'REGULATORY_REPORT', authority: 'MOLIT', report_type: 'MONTHLY_SAFETY', period: '2026-01', compliance_score: 98.5 }, created_by: 'compliance-officer' },
    { payload: { event_type: 'FLEET_STATUS_UPDATE', drones_active: 4, drones_grounded: 2, total_flights_today: 12, incidents_today: 1 }, created_by: 'fleet-manager' },
    { payload: { event_type: 'COMMUNICATION_LOG', asset_ref: { type: 'drone', id: 'DRONE-001' }, message: 'RTH command acknowledged', signal_strength_dbm: -72 }, created_by: 'comm-relay' },
    { payload: { event_type: 'AIRSPACE_CLEARANCE', zone: 'SECTOR-7', cleared_by: 'ATC-controller-han', valid_until: '2026-02-10T18:00:00Z', altitude_ceiling_ft: 400 }, created_by: 'atc-interface' },
  ];

  for (const ev of additionalEvidence) {
    const r = await api('POST', '/v1/evidence/create', { tenant_id: TENANT, ...ev });
    if (r) log(`Evidence #${r.sequence_num}: ${ev.payload.event_type}`);
  }

  const cp2 = await api('POST', `/v1/chains/${TENANT}/checkpoint`);
  if (cp2) log(`Checkpoint #2: seq ${cp2.sequence_from}-${cp2.sequence_to}`);

  // 최종 증거 몇 건 추가 + 3차 체크포인트
  const finalEvidence = [
    { payload: { event_type: 'SHIFT_HANDOVER', from_shift: 'DAY', to_shift: 'NIGHT', handover_by: 'ops-controller-lee', accepted_by: 'ops-controller-yoon', open_issues: 2 }, created_by: 'shift-manager' },
    { payload: { event_type: 'DAILY_SUMMARY', date: '2026-02-10', total_evidence: 35, total_overrides: 6, chain_valid: true, safety_score: 94.8 }, created_by: 'report-daemon' },
  ];

  for (const ev of finalEvidence) {
    const r = await api('POST', '/v1/evidence/create', { tenant_id: TENANT, ...ev });
    if (r) log(`Evidence #${r.sequence_num}: ${ev.payload.event_type}`);
  }

  const cp3 = await api('POST', `/v1/chains/${TENANT}/checkpoint`);
  if (cp3) log(`Checkpoint #3: seq ${cp3.sequence_from}-${cp3.sequence_to}`);

  // ── 완료 ──
  console.log('\n' + '='.repeat(60));
  console.log('  Seed 완료! (확장판)');
  console.log('  - 37개 증거 레코드');
  console.log('  - 3개 체크포인트');
  console.log('  - 1개 상태 머신 (6 states, 6 transitions)');
  console.log('  - 6개 드론 (각기 다른 상태)');
  console.log('  - 6개 Override (2 EXECUTED, 2 PENDING, 2 REJECTED)');
  console.log('  - 8개 감사 보고서 (4종 × 2회)');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
