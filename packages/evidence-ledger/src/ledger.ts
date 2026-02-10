import { SupabaseClient } from '@supabase/supabase-js';
import { hashPayload, computeChainHash, computeMerkleRoot, GENESIS_HASH } from './hash';
import type { EvidenceRecord, AppendEvidenceInput, ChainHead, VerifyResult, Checkpoint } from './types';

/**
 * EvidenceLedger — NXTPrism 해시체인 증거 원장
 *
 * 핵심 원칙:
 * - Append-only (추가만 가능, 수정/삭제 불가)
 * - 모든 증거는 이전 증거의 해시와 연결 (체인)
 * - 변조 시 체인이 깨져서 즉시 탐지 가능
 */
export class EvidenceLedger {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 체인 헤드 조회 — 테넌트의 최신 증거
   */
  async getChainHead(tenantId: string): Promise<ChainHead | null> {
    const { data, error } = await this.supabase
      .from('evidence_records')
      .select('evidence_id, tenant_id, sequence_num, chain_hash, created_at')
      .eq('tenant_id', tenantId)
      .order('sequence_num', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data as ChainHead;
  }

  /**
   * 증거 추가 — 해시체인에 새 증거를 연결
   *
   * 1. 현재 체인 헤드(마지막 증거)를 가져옴
   * 2. payload를 해시
   * 3. prev_hash + payload_hash + metadata로 chain_hash 계산
   * 4. DB에 INSERT
   */
  async appendEvidence(input: AppendEvidenceInput): Promise<EvidenceRecord> {
    // 1. 현재 체인 헤드 조회
    const head = await this.getChainHead(input.tenant_id);

    const prevHash = head ? head.chain_hash : GENESIS_HASH;
    const sequenceNum = head ? head.sequence_num + 1 : 1;

    // 2. payload 해시
    const payloadHash = hashPayload(input.payload);

    // 3. 현재 시각
    const createdAt = new Date().toISOString();

    // 4. chain_hash 계산
    const chainHash = computeChainHash(prevHash, payloadHash, {
      tenant_id: input.tenant_id,
      sequence_num: sequenceNum,
      created_at: createdAt,
    });

    // 5. DB에 삽입
    const record = {
      tenant_id: input.tenant_id,
      sequence_num: sequenceNum,
      prev_hash: prevHash,
      payload: input.payload,
      payload_hash: payloadHash,
      chain_hash: chainHash,
      decision_id: input.decision_id || null,
      policy_version_id: input.policy_version_id || null,
      state_transition_id: input.state_transition_id || null,
      attestation_refs: input.attestation_refs || [],
      created_by: input.created_by || null,
      created_at: createdAt,
    };

    const { data, error } = await this.supabase
      .from('evidence_records')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`증거 추가 실패: ${error.message}`);
    }

    return data as EvidenceRecord;
  }

  /**
   * 증거 조회 (ID)
   */
  async getEvidence(evidenceId: string): Promise<EvidenceRecord | null> {
    const { data, error } = await this.supabase
      .from('evidence_records')
      .select('*')
      .eq('evidence_id', evidenceId)
      .single();

    if (error || !data) return null;
    return data as EvidenceRecord;
  }

  /**
   * 체인 검증 — 해시체인의 무결성을 확인
   *
   * 첫 번째 증거부터 순서대로:
   * 1. payload_hash가 payload와 일치하는지
   * 2. chain_hash가 prev_hash + payload_hash + metadata로 재계산한 것과 일치하는지
   * 3. prev_hash가 이전 증거의 chain_hash와 일치하는지
   *
   * 하나라도 안 맞으면 → 변조 탐지!
   */
  async verifyChain(tenantId: string): Promise<VerifyResult> {
    const { data: records, error } = await this.supabase
      .from('evidence_records')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sequence_num', { ascending: true });

    if (error) {
      return { valid: false, records_checked: 0, error: error.message };
    }

    if (!records || records.length === 0) {
      return { valid: true, records_checked: 0 };
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < records.length; i++) {
      const record = records[i] as EvidenceRecord;

      // 검증 1: prev_hash가 이전 증거의 chain_hash와 일치?
      if (record.prev_hash !== expectedPrevHash) {
        return {
          valid: false,
          records_checked: i + 1,
          first_invalid_at: record.sequence_num,
          error: `prev_hash 불일치 (sequence ${record.sequence_num}): expected ${expectedPrevHash.slice(0, 20)}..., got ${record.prev_hash.slice(0, 20)}...`,
        };
      }

      // 검증 2: payload_hash가 payload를 다시 해시한 것과 일치?
      const recomputedPayloadHash = hashPayload(record.payload);
      if (record.payload_hash !== recomputedPayloadHash) {
        return {
          valid: false,
          records_checked: i + 1,
          first_invalid_at: record.sequence_num,
          error: `payload_hash 불일치 (sequence ${record.sequence_num}): payload가 변조됨`,
        };
      }

      // 검증 3: chain_hash 재계산
      const recomputedChainHash = computeChainHash(record.prev_hash, record.payload_hash, {
        tenant_id: record.tenant_id,
        sequence_num: record.sequence_num,
        created_at: record.created_at,
      });

      if (record.chain_hash !== recomputedChainHash) {
        return {
          valid: false,
          records_checked: i + 1,
          first_invalid_at: record.sequence_num,
          error: `chain_hash 불일치 (sequence ${record.sequence_num}): 메타데이터가 변조됨`,
        };
      }

      // 다음 증거의 prev_hash 기대값 설정
      expectedPrevHash = record.chain_hash;
    }

    return { valid: true, records_checked: records.length };
  }

  /**
   * 체크포인트 생성 — Merkle root로 구간 요약
   */
  async createCheckpoint(tenantId: string): Promise<Checkpoint> {
    // 마지막 체크포인트 이후의 증거들을 가져옴
    const { data: lastCheckpoint } = await this.supabase
      .from('checkpoints')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sequence_to', { ascending: false })
      .limit(1)
      .single();

    const fromSeq = lastCheckpoint ? lastCheckpoint.sequence_to + 1 : 1;

    const { data: records, error } = await this.supabase
      .from('evidence_records')
      .select('chain_hash, sequence_num')
      .eq('tenant_id', tenantId)
      .gte('sequence_num', fromSeq)
      .order('sequence_num', { ascending: true });

    if (error || !records || records.length === 0) {
      throw new Error('체크포인트 생성 실패: 새 증거가 없습니다');
    }

    const hashes = records.map((r: any) => r.chain_hash);
    const merkleRoot = computeMerkleRoot(hashes);
    const headHash = hashes[hashes.length - 1];
    const sequenceTo = records[records.length - 1].sequence_num;

    const checkpoint = {
      tenant_id: tenantId,
      sequence_from: fromSeq,
      sequence_to: sequenceTo,
      merkle_root: merkleRoot,
      head_hash: headHash,
      record_count: records.length,
    };

    const { data, error: insertError } = await this.supabase
      .from('checkpoints')
      .insert(checkpoint)
      .select()
      .single();

    if (insertError) {
      throw new Error(`체크포인트 저장 실패: ${insertError.message}`);
    }

    return data as Checkpoint;
  }
}
