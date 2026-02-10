-- NXTPrism STEP 8: Audit Export 테이블
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS audit_exports (
  export_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  export_type TEXT NOT NULL,           -- AUDIT_REPORT, DECISION_EXPORT, CHAIN_AUDIT, COMPLIANCE_SNAPSHOT, OVERRIDE_HISTORY
  requested_by TEXT NOT NULL,
  report JSONB NOT NULL,               -- 보고서 본문
  report_hash TEXT NOT NULL,           -- 보고서 SHA-256 해시
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_audit_exports_tenant ON audit_exports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_exports_type ON audit_exports(tenant_id, export_type);

-- RLS (개발용 permissive)
ALTER TABLE audit_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_exports_select_all" ON audit_exports FOR SELECT USING (true);
CREATE POLICY "audit_exports_insert_all" ON audit_exports FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_exports_update_all" ON audit_exports FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "audit_exports_delete_all" ON audit_exports FOR DELETE USING (true);
