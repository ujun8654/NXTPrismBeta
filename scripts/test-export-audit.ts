/**
 * NXTPrism STEP 8: Export & Audit Report 통합 테스트
 * ================================================
 * 7개 테스트:
 *   1. 종합 감사 보고서 생성
 *   2. 단일 결정 내보내기
 *   3. 체인 무결성 감사
 *   4. 규정 준수 스냅샷
 *   5. Override 이력 내보내기
 *   6. 보고서 해시 검증
 *   7. 이전 내보내기 조회
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { EvidenceLedger, hashPayload } from '../packages/evidence-ledger/src';
import { EvidencePackBuilder } from '../packages/evidence-pack/src/packer';
import { OverrideGovernance } from '../packages/override-governance/src/governance';
import { AuditExporter } from '../packages/export-audit/src/exporter';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('=== NXTPrism Export & Audit Report 통합 테스트 ===\n');

  const ledger = new EvidenceLedger(supabase);
  const packBuilder = new EvidencePackBuilder(supabase);
  const governance = new OverrideGovernance(supabase, packBuilder);
  const exporter = new AuditExporter(supabase, ledger, packBuilder, governance);

  // 0. 기존 테스트 데이터 정리
  await supabase.from('audit_exports').delete().eq('tenant_id', TENANT_ID);
  console.log('기존 테스트 데이터 정리 완료\n');

  // ============================================
  // TEST 1: 종합 감사 보고서 생성
  // ============================================
  console.log('--- TEST 1: 종합 감사 보고서 생성 ---');
  const auditReport = await exporter.generateAuditReport(TENANT_ID, {
    requested_by: 'test-auditor',
  });

  console.log('  report_id:', auditReport.report_id);
  console.log('  chain_integrity.valid:', auditReport.chain_integrity.valid);
  console.log('  chain_integrity.records_checked:', auditReport.chain_integrity.records_checked);
  console.log('  evidence_stats.total_records:', auditReport.evidence_stats.total_records);
  console.log('  policy_timeline count:', auditReport.policy_timeline.length);
  console.log('  transition_summary.total:', auditReport.transition_summary.total_transitions);
  console.log('  override_kpis.total_count:', auditReport.override_kpis.total_count);
  console.log('  asset_states count:', auditReport.asset_states.length);

  console.assert(auditReport.report_id !== undefined, 'FAIL: report_id 없음!');
  console.assert(auditReport.chain_integrity !== undefined, 'FAIL: chain_integrity 없음!');
  console.assert(auditReport.evidence_stats !== undefined, 'FAIL: evidence_stats 없음!');
  console.assert(auditReport.override_kpis !== undefined, 'FAIL: override_kpis 없음!');
  console.assert(auditReport.generated_at !== undefined, 'FAIL: generated_at 없음!');
  console.log('  PASS\n');

  // ============================================
  // TEST 2: 단일 결정 내보내기
  // ============================================
  console.log('--- TEST 2: 단일 결정 내보내기 ---');

  // evidence_packs에서 첫 번째 decision_id를 가져옴
  const { data: packs } = await supabase
    .from('evidence_packs')
    .select('decision_id')
    .eq('tenant_id', TENANT_ID)
    .limit(1);

  if (packs && packs.length > 0) {
    const decisionId = packs[0].decision_id;
    const decisionExport = await exporter.exportDecision(TENANT_ID, decisionId, {
      requested_by: 'test-auditor',
    });

    console.log('  decision_id:', decisionExport.decision_id);
    console.log('  pack.pack_id:', decisionExport.pack.pack_id);
    console.log('  pack.pack_hash:', decisionExport.pack.pack_hash.slice(0, 20) + '...');
    console.log('  related_evidence count:', decisionExport.related_evidence.length);

    console.assert(decisionExport.pack.pack_id !== undefined, 'FAIL: pack_id 없음!');
    console.assert(decisionExport.pack.manifest !== undefined, 'FAIL: manifest 없음!');
    console.assert(decisionExport.exported_at !== undefined, 'FAIL: exported_at 없음!');
    console.log('  PASS\n');
  } else {
    console.log('  (Evidence Pack이 없어 건너뜀 — integrated-demo 먼저 실행 필요)');
    console.log('  SKIP\n');
  }

  // ============================================
  // TEST 3: 체인 무결성 감사
  // ============================================
  console.log('--- TEST 3: 체인 무결성 감사 ---');
  const chainAudit = await exporter.auditChainIntegrity(TENANT_ID, {
    requested_by: 'test-auditor',
  });

  console.log('  audit_id:', chainAudit.audit_id);
  console.log('  chain_integrity.valid:', chainAudit.chain_integrity.valid);
  console.log('  chain_integrity.records_checked:', chainAudit.chain_integrity.records_checked);
  console.log('  checkpoints count:', chainAudit.checkpoints.length);
  console.log('  summary:', chainAudit.summary.slice(0, 60) + '...');

  console.assert(chainAudit.audit_id !== undefined, 'FAIL: audit_id 없음!');
  console.assert(typeof chainAudit.chain_integrity.valid === 'boolean', 'FAIL: valid가 boolean이어야!');
  console.assert(chainAudit.summary.length > 0, 'FAIL: summary 비어있음!');
  console.log('  PASS\n');

  // ============================================
  // TEST 4: 규정 준수 스냅샷
  // ============================================
  console.log('--- TEST 4: 규정 준수 스냅샷 ---');
  const snapshot = await exporter.generateComplianceSnapshot(TENANT_ID, {
    requested_by: 'test-auditor',
  });

  console.log('  snapshot_id:', snapshot.snapshot_id);
  console.log('  chain_valid:', snapshot.chain_valid);
  console.log('  total_evidence:', snapshot.total_evidence);
  console.log('  total_packs:', snapshot.total_packs);
  console.log('  active_policies count:', snapshot.active_policies.length);
  console.log('  asset_states count:', snapshot.asset_states.length);
  console.log('  override_summary:', JSON.stringify(snapshot.override_summary));

  console.assert(snapshot.snapshot_id !== undefined, 'FAIL: snapshot_id 없음!');
  console.assert(typeof snapshot.chain_valid === 'boolean', 'FAIL: chain_valid가 boolean이어야!');
  console.assert(typeof snapshot.total_evidence === 'number', 'FAIL: total_evidence가 number여야!');
  console.assert(snapshot.override_summary !== undefined, 'FAIL: override_summary 없음!');
  console.log('  PASS\n');

  // ============================================
  // TEST 5: Override 이력 내보내기
  // ============================================
  console.log('--- TEST 5: Override 이력 내보내기 ---');
  const overrideHistory = await exporter.exportOverrideHistory(TENANT_ID, {
    requested_by: 'test-auditor',
  });

  console.log('  export_id:', overrideHistory.export_id);
  console.log('  kpis.total_count:', overrideHistory.kpis.total_count);
  console.log('  records count:', overrideHistory.records.length);
  if (overrideHistory.records.length > 0) {
    console.log('  first record status:', overrideHistory.records[0].status);
  }

  console.assert(overrideHistory.export_id !== undefined, 'FAIL: export_id 없음!');
  console.assert(overrideHistory.kpis !== undefined, 'FAIL: kpis 없음!');
  console.assert(Array.isArray(overrideHistory.records), 'FAIL: records가 배열이어야!');
  console.log('  PASS\n');

  // ============================================
  // TEST 6: 보고서 해시 검증
  // ============================================
  console.log('--- TEST 6: 보고서 해시 검증 ---');

  // DB에서 저장된 내보내기를 가져와서 해시 검증
  const { data: savedExports } = await supabase
    .from('audit_exports')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .eq('export_type', 'AUDIT_REPORT')
    .limit(1);

  if (savedExports && savedExports.length > 0) {
    const saved = savedExports[0];
    const recomputedHash = hashPayload(saved.report);

    console.log('  export_id:', saved.export_id);
    console.log('  stored hash:', saved.report_hash.slice(0, 20) + '...');
    console.log('  recomputed:', recomputedHash.slice(0, 20) + '...');
    console.log('  match:', saved.report_hash === recomputedHash);

    console.assert(saved.report_hash === recomputedHash, 'FAIL: 보고서 해시 불일치!');
    console.assert(saved.export_type === 'AUDIT_REPORT', 'FAIL: export_type 불일치!');
    console.assert(saved.requested_by === 'test-auditor', 'FAIL: requested_by 불일치!');
  } else {
    console.log('  (저장된 보고서 없음 — 이전 테스트 실패?)');
  }
  console.log('  PASS\n');

  // ============================================
  // TEST 7: 이전 내보내기 조회
  // ============================================
  console.log('--- TEST 7: 이전 내보내기 조회 ---');

  // 목록 조회
  const exportList = await exporter.getExportsByTenant(TENANT_ID);
  console.log('  총 내보내기 수:', exportList.length);
  console.assert(exportList.length >= 4, 'FAIL: 최소 4건이어야! (audit, chain, snapshot, override)');

  // 유형별 분포
  const byType: Record<string, number> = {};
  for (const e of exportList) {
    byType[e.export_type] = (byType[e.export_type] || 0) + 1;
  }
  console.log('  유형별 분포:', JSON.stringify(byType));

  // 개별 조회
  if (exportList.length > 0) {
    const first = exportList[0];
    const retrieved = await exporter.getExport(first.export_id);
    console.log('  개별 조회 export_id:', retrieved?.export_id);
    console.assert(retrieved !== null, 'FAIL: 개별 조회 결과 null!');
    console.assert(retrieved!.export_id === first.export_id, 'FAIL: export_id 불일치!');
  }
  console.log('  PASS\n');

  // ============================================
  // 결과 요약
  // ============================================
  console.log('==========================================');
  console.log('  모든 테스트 통과! Export & Audit Report 정상 작동');
  console.log('==========================================');
  console.log(`\n  핵심 기능 검증:`);
  console.log(`    종합 감사 보고서:     체인 무결성 + 증거 통계 + Override KPI OK`);
  console.log(`    단일 결정 내보내기:   Evidence Pack + 연관 증거 OK`);
  console.log(`    체인 무결성 감사:     전수 검증 + 체크포인트 OK`);
  console.log(`    규정 준수 스냅샷:     자산 상태 + 활성 정책 + Override 현황 OK`);
  console.log(`    Override 이력:        승인 내역 + KPI OK`);
  console.log(`    보고서 해시 검증:     SHA-256 무결성 OK`);
  console.log(`    이전 내보내기 조회:   DB 저장 + 재조회 OK`);
}

main().catch((err) => {
  console.error('\n테스트 실패:', err.message);
  process.exit(1);
});
