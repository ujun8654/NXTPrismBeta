-- =============================================
-- NXTPrism STEP 5: evidence_packs 테이블 생성
-- Supabase SQL Editor에서 실행
-- =============================================

CREATE TABLE IF NOT EXISTS evidence_packs (
  pack_id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES tenants(tenant_id),
  decision_id    TEXT NOT NULL,
  pack_version   TEXT NOT NULL DEFAULT '1.0',
  manifest       JSONB NOT NULL,
  pack_hash      TEXT NOT NULL,
  evidence_ids   TEXT[] DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, decision_id)
);

-- RLS (개발용 permissive)
ALTER TABLE evidence_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_all" ON evidence_packs FOR ALL USING (true) WITH CHECK (true);
