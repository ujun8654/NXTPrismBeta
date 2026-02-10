-- ============================================
-- NXTPrism 개발용 RLS 정책
-- Supabase SQL Editor에서 실행
-- ============================================

-- evidence_records 테이블 정책
CREATE POLICY "Allow all for evidence_records" ON evidence_records
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- checkpoints 테이블 정책
CREATE POLICY "Allow all for checkpoints" ON checkpoints
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- tenants 테이블 정책
CREATE POLICY "Allow all for tenants" ON tenants
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 확인
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('evidence_records', 'checkpoints', 'tenants');
