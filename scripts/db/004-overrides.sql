-- NXTPrism STEP 7: Override Governance 테이블
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS overrides (
  override_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  reason_code TEXT NOT NULL,          -- EMERGENCY_SAFETY, MAINTENANCE_REQUIRED, REGULATORY_WAIVER, OPERATIONAL_NECESSITY, OTHER
  reason_text TEXT NOT NULL,          -- 상세 사유
  impact_scope TEXT NOT NULL DEFAULT 'single_asset',  -- single_asset, fleet, system
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  machine_id TEXT NOT NULL,
  asset_ref JSONB NOT NULL,           -- { type, id }
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  transition_record_id UUID,          -- 실행된 전이 기록 (EXECUTED 시 채움)
  required_approvals JSONB NOT NULL DEFAULT '[]'::jsonb,  -- ["SUPERVISOR", "COMPLIANCE"]
  approvals JSONB NOT NULL DEFAULT '[]'::jsonb,           -- [{ role, actor_id, actor_kind, approved_at }]
  status TEXT NOT NULL DEFAULT 'REQUESTED',  -- REQUESTED, PENDING_APPROVAL, APPROVED, REJECTED, EXECUTED, EXPIRED
  evidence_pack_id UUID,              -- 생성된 Override Evidence Pack ID
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_overrides_tenant ON overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_overrides_status ON overrides(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_overrides_machine ON overrides(tenant_id, machine_id);

-- RLS (개발용 permissive)
ALTER TABLE overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "overrides_select_all" ON overrides FOR SELECT USING (true);
CREATE POLICY "overrides_insert_all" ON overrides FOR INSERT WITH CHECK (true);
CREATE POLICY "overrides_update_all" ON overrides FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "overrides_delete_all" ON overrides FOR DELETE USING (true);
