import { createHash } from 'crypto';

/**
 * SHA-256 해시 생성
 */
export function sha256(data: string): string {
  return 'sha256:' + createHash('sha256').update(data, 'utf-8').digest('hex');
}

/**
 * 객체의 모든 키를 재귀적으로 정렬 (JSONB 키순서 변경 대응)
 */
function sortDeep(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortDeep);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortDeep((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * payload를 정규화(canonical)하여 해시 생성
 * - 모든 중첩 객체의 키를 재귀적으로 알파벳 순 정렬
 * - JSONB 저장/조회 후에도 동일한 해시 보장
 */
export function hashPayload(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(sortDeep(payload));
  return sha256(canonical);
}

/**
 * 체인 해시 계산
 * chain_hash = SHA-256(prev_hash + payload_hash + metadata_hash)
 * created_at은 항상 UTC ISO 형식(Z suffix)으로 정규화하여
 * DB 저장/조회 시 형식 차이(+00:00 vs Z)로 인한 해시 불일치 방지
 */
export function computeChainHash(
  prevHash: string,
  payloadHash: string,
  metadata: { tenant_id: string; sequence_num: number; created_at: string }
): string {
  const normalized = {
    ...metadata,
    created_at: new Date(metadata.created_at).toISOString(),
  };
  const metadataStr = JSON.stringify(normalized, Object.keys(normalized).sort());
  const metadataHash = sha256(metadataStr);
  return sha256(prevHash + '|' + payloadHash + '|' + metadataHash);
}

/**
 * Merkle root 계산
 * 해시 목록을 2개씩 짝지어 올라가며 최종 루트 해시 생성
 */
export function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return sha256('EMPTY');
  if (hashes.length === 1) return hashes[0];

  let level = [...hashes];

  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        next.push(sha256(level[i] + '|' + level[i + 1]));
      } else {
        // 홀수개면 마지막은 자기 자신과 짝
        next.push(sha256(level[i] + '|' + level[i]));
      }
    }
    level = next;
  }

  return level[0];
}

/** 제네시스 블록의 prev_hash (체인의 시작점) */
export const GENESIS_HASH = sha256('NXTPRISM_GENESIS_V1');
