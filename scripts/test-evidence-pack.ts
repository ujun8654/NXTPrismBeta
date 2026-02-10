/**
 * NXTPrism STEP 5: Evidence Pack 통합 테스트
 * ============================================
 * 7개 테스트:
 *   1. 팩 생성 (기본)
 *   2. 팩 조회 (pack_id)
 *   3. 팩 조회 (decision_id)
 *   4. 중복 decision_id 방지
 *   5. 팩 검증 (정상)
 *   6. 팩 검증 (변조 탐지)
 *   7. 필수 필드 검증 (attestations 누락)
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { EvidencePackBuilder } from '../packages/evidence-pack/src/packer';
import type { BuildPackInput } from '../packages/evidence-pack/src/types';
import type { EvidencePack } from '../packages/core-trust/src/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

function makeSampleInput(decisionId: string): BuildPackInput {
  return {
    tenant_id: TENANT_ID,
    decision: {
      decision_id: decisionId,
      tenant_id: TENANT_ID,
      occurred_at: new Date().toISOString(),
      system: 'flight-ops-system',
      asset_ref: { type: 'drone', id: 'DRONE-001' },
      outcome: { type: 'flight_clearance', value: 'GO' },
      confidence: 0.95,
    },
    context_refs: [
      {
        uri: 's3://nxtprism-evidence/sensor/battery-001.json',
        hash: 'sha256:abc123def456',
        hash_alg: 'SHA-256',
        captured_at: new Date().toISOString(),
      },
    ],
    policy: {
      policy_id: 'drone-flight-safety',
      policy_version: 'v1.0.0',
      engine: 'deterministic-policy-engine',
      evaluation_result: {
        allowed: true,
        reasons: ['All conditions met'],
        score: 1.0,
      },
    },
    state_transition: {
      machine_id: 'drone-airworthiness',
      machine_version: 'v1.0.0',
      from: 'SERVICEABLE',
      to: 'MONITORING',
      trigger: 'AI_RECOMMENDATION',
      gate_mode: 'SHADOW',
    },
    attestations: [
      {
        type: 'ORG_ATTESTATION',
        actor: { kind: 'service', id: 'flight-ops-system' },
        role: 'OPERATOR',
        auth_context: { method: 'KMS_HSM', key_id: 'key-001' },
        signed_at: new Date().toISOString(),
      },
    ],
    integrity: {
      prev_hash: 'sha256:0000000000000000',
      chain_hash: 'sha256:1111111111111111',
      checkpoint_ref: 'cp-001',
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
    evidence_ids: ['ev-001', 'ev-002'],
  };
}

async function main() {
  console.log('=== NXTPrism Evidence Pack 통합 테스트 ===\n');

  const packBuilder = new EvidencePackBuilder(supabase);

  // 0. 기존 테스트 데이터 정리
  await supabase.from('evidence_packs').delete().eq('tenant_id', TENANT_ID);
  console.log('기존 테스트 데이터 정리 완료\n');

  // ============================================
  // TEST 1: 팩 생성 (기본)
  // ============================================
  console.log('--- TEST 1: Evidence Pack 생성 ---');
  const input1 = makeSampleInput('DEC-TEST-001');
  const pack1 = await packBuilder.buildPack(input1);

  console.log('  pack_id:', pack1.pack_id);
  console.log('  decision_id:', pack1.decision_id);
  console.log('  pack_version:', pack1.pack_version);
  console.log('  pack_hash:', pack1.pack_hash.slice(0, 40) + '...');
  console.assert(pack1.pack_id !== undefined, 'FAIL: pack_id가 없음!');
  console.assert(pack1.decision_id === 'DEC-TEST-001', 'FAIL: decision_id 불일치!');
  console.assert(pack1.pack_version === '1.0', 'FAIL: pack_version 불일치!');
  console.assert(pack1.pack_hash.startsWith('sha256:'), 'FAIL: pack_hash 형식 오류!');
  console.assert(pack1.manifest.pack_version === '1.0', 'FAIL: manifest.pack_version 불일치!');
  console.log('  PASS\n');

  // ============================================
  // TEST 2: 팩 조회 (pack_id)
  // ============================================
  console.log('--- TEST 2: 팩 조회 (pack_id) ---');
  const fetched = await packBuilder.getPack(pack1.pack_id);

  console.log('  조회된 pack_id:', fetched?.pack_id);
  console.assert(fetched !== null, 'FAIL: 팩 조회 실패!');
  console.assert(fetched!.pack_id === pack1.pack_id, 'FAIL: pack_id 불일치!');
  console.assert(fetched!.pack_hash === pack1.pack_hash, 'FAIL: pack_hash 불일치!');
  console.assert(fetched!.manifest.decision.decision_id === 'DEC-TEST-001', 'FAIL: manifest 내용 불일치!');
  console.log('  PASS\n');

  // ============================================
  // TEST 3: 팩 조회 (decision_id)
  // ============================================
  console.log('--- TEST 3: 팩 조회 (decision_id) ---');
  const fetchedByDec = await packBuilder.getPackByDecision(TENANT_ID, 'DEC-TEST-001');

  console.log('  조회된 decision_id:', fetchedByDec?.decision_id);
  console.assert(fetchedByDec !== null, 'FAIL: decision_id 조회 실패!');
  console.assert(fetchedByDec!.pack_id === pack1.pack_id, 'FAIL: pack_id 불일치!');
  console.log('  PASS\n');

  // ============================================
  // TEST 4: 중복 decision_id 방지
  // ============================================
  console.log('--- TEST 4: 중복 decision_id 방지 ---');
  const duplicateInput = makeSampleInput('DEC-TEST-001');
  let duplicateError = false;
  try {
    await packBuilder.buildPack(duplicateInput);
  } catch (err: any) {
    duplicateError = true;
    console.log('  예상된 에러:', err.message.slice(0, 60) + '...');
  }
  console.assert(duplicateError === true, 'FAIL: 중복 생성이 허용됨!');
  console.log('  PASS\n');

  // ============================================
  // TEST 5: 팩 검증 (정상)
  // ============================================
  console.log('--- TEST 5: 팩 검증 (정상) ---');
  const verifyResult = packBuilder.verifyPack(pack1.manifest, pack1.pack_hash);

  console.log('  valid:', verifyResult.valid);
  console.log('  checks:', JSON.stringify(verifyResult.checks));
  console.assert(verifyResult.valid === true, 'FAIL: 정상 팩 검증 실패!');
  console.assert(verifyResult.checks.hash_match === true, 'FAIL: 해시 불일치!');
  console.assert(verifyResult.checks.version_valid === true, 'FAIL: 버전 검증 실패!');
  console.assert(verifyResult.checks.context_refs_present === true, 'FAIL: context_refs 검증 실패!');
  console.assert(verifyResult.checks.attestations_present === true, 'FAIL: attestations 검증 실패!');
  console.log('  PASS\n');

  // ============================================
  // TEST 6: 팩 검증 (변조 탐지)
  // ============================================
  console.log('--- TEST 6: 팩 검증 (변조 탐지) ---');
  const tamperedManifest: EvidencePack = {
    ...pack1.manifest,
    decision: { ...pack1.manifest.decision, confidence: 0.01 },
  };
  const tamperResult = packBuilder.verifyPack(tamperedManifest, pack1.pack_hash);

  console.log('  valid:', tamperResult.valid);
  console.log('  error:', tamperResult.error);
  console.assert(tamperResult.valid === false, 'FAIL: 변조를 탐지하지 못함!');
  console.assert(tamperResult.checks.hash_match === false, 'FAIL: 해시 불일치 미감지!');
  console.log('  PASS\n');

  // ============================================
  // TEST 7: 필수 필드 검증 (attestations 누락)
  // ============================================
  console.log('--- TEST 7: 필수 필드 검증 (attestations=[]) ---');
  const emptyAttManifest: EvidencePack = {
    ...pack1.manifest,
    attestations: [],
  };
  // 빈 attestations manifest의 해시를 새로 계산해서 hash_match는 true로 만들어도 attestations_present 검증 실패해야 함
  const { hashPayload } = await import('../packages/evidence-ledger/src/hash');
  const emptyAttHash = hashPayload(emptyAttManifest as unknown as Record<string, unknown>);
  const fieldResult = packBuilder.verifyPack(emptyAttManifest, emptyAttHash);

  console.log('  valid:', fieldResult.valid);
  console.log('  checks:', JSON.stringify(fieldResult.checks));
  console.assert(fieldResult.valid === false, 'FAIL: attestations=[] 허용됨!');
  console.assert(fieldResult.checks.hash_match === true, 'FAIL: 해시는 맞아야 함!');
  console.assert(fieldResult.checks.attestations_present === false, 'FAIL: attestations 누락 미감지!');
  console.log('  PASS\n');

  // ============================================
  // 결과 요약
  // ============================================
  console.log('==========================================');
  console.log('  모든 테스트 통과! Evidence Pack 정상 작동');
  console.log('==========================================');
  console.log(`\n  Pack ID:      ${pack1.pack_id}`);
  console.log(`  Decision:     ${pack1.decision_id}`);
  console.log(`  Hash:         ${pack1.pack_hash.slice(0, 40)}...`);
  console.log(`  Evidence IDs: [${pack1.evidence_ids.join(', ')}]`);
  console.log(`  Manifest:     ${JSON.stringify(pack1.manifest).length} chars`);
}

main().catch((err) => {
  console.error('\n테스트 실패:', err.message);
  process.exit(1);
});
