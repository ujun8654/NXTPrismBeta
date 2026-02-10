-- ============================================
-- NXTPrism STEP 2: policy_versions 테이블
-- Supabase SQL Editor에서 실행
-- ============================================

CREATE TABLE IF NOT EXISTS policy_versions (
  policy_version_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id         TEXT NOT NULL,
  version           TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  definition        JSONB NOT NULL,        -- 전체 정책 정의 (불변 보존)
  is_active         BOOLEAN DEFAULT true,
  published_at      TIMESTAMPTZ DEFAULT now(),
  published_by      TEXT NOT NULL,

  -- 같은 policy_id + version 조합은 유일해야 함
  UNIQUE (policy_id, version)
);

-- 인덱스
CREATE INDEX idx_policy_active ON policy_versions (policy_id, is_active)
  WHERE is_active = true;

-- RLS
ALTER TABLE policy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for policy_versions" ON policy_versions
  FOR ALL USING (true) WITH CHECK (true);

-- 확인
SELECT 'policy_versions table created!' AS result;
