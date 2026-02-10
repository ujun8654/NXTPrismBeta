import { SupabaseClient } from '@supabase/supabase-js';
import { hashPayload } from '@nxtprism/evidence-ledger';
import type { EvidencePack } from '@nxtprism/core-trust';
import type { BuildPackInput, PackRecord, VerifyPackResult } from './types';

/**
 * EvidencePackBuilder — Evidence Pack 조립·저장·검증
 *
 * 하나의 Decision에 관련된 모든 증거·정책·상태전이·승인을
 * 봉인된 감사용 컨테이너(Evidence Pack)로 번들링한다.
 */
export class EvidencePackBuilder {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Evidence Pack 생성
   *
   * 1. input으로부터 EvidencePack manifest 조립
   * 2. manifest를 canonical JSON으로 해시
   * 3. DB에 저장
   */
  async buildPack(input: BuildPackInput): Promise<PackRecord> {
    const manifest: EvidencePack = {
      pack_version: '1.0',
      decision: input.decision,
      context_refs: input.context_refs,
      policy: input.policy,
      ...(input.model_runtime ? { model_runtime: input.model_runtime } : {}),
      state_transition: input.state_transition,
      attestations: input.attestations,
      integrity: input.integrity,
      retention: input.retention,
      privacy: input.privacy,
    };

    const packHash = hashPayload(manifest as unknown as Record<string, unknown>);

    const record = {
      tenant_id: input.tenant_id,
      decision_id: input.decision.decision_id,
      pack_version: '1.0',
      manifest,
      pack_hash: packHash,
      evidence_ids: input.evidence_ids || [],
    };

    const { data, error } = await this.supabase
      .from('evidence_packs')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Evidence Pack 생성 실패: ${error.message}`);
    }

    return data as PackRecord;
  }

  /**
   * Evidence Pack 조회 (pack_id)
   */
  async getPack(packId: string): Promise<PackRecord | null> {
    const { data, error } = await this.supabase
      .from('evidence_packs')
      .select('*')
      .eq('pack_id', packId)
      .single();

    if (error || !data) return null;
    return data as PackRecord;
  }

  /**
   * Evidence Pack 조회 (tenant_id + decision_id)
   */
  async getPackByDecision(tenantId: string, decisionId: string): Promise<PackRecord | null> {
    const { data, error } = await this.supabase
      .from('evidence_packs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('decision_id', decisionId)
      .single();

    if (error || !data) return null;
    return data as PackRecord;
  }

  /**
   * Evidence Pack 무결성 검증
   *
   * 1. manifest를 재해시하여 expectedHash와 비교
   * 2. 필수 필드 존재 확인
   * 3. pack_version 확인
   */
  verifyPack(manifest: EvidencePack, expectedHash: string): VerifyPackResult {
    const recomputedHash = hashPayload(manifest as unknown as Record<string, unknown>);
    const hashMatch = recomputedHash === expectedHash;

    const versionValid = manifest.pack_version === '1.0';
    const contextRefsPresent = Array.isArray(manifest.context_refs) && manifest.context_refs.length >= 1;
    const attestationsPresent = Array.isArray(manifest.attestations) && manifest.attestations.length >= 1;

    const valid = hashMatch && versionValid && contextRefsPresent && attestationsPresent;

    const checks = {
      hash_match: hashMatch,
      version_valid: versionValid,
      context_refs_present: contextRefsPresent,
      attestations_present: attestationsPresent,
    };

    if (!valid) {
      const failures = Object.entries(checks)
        .filter(([, v]) => !v)
        .map(([k]) => k);
      return { valid, checks, error: `검증 실패: ${failures.join(', ')}` };
    }

    return { valid, checks };
  }
}
