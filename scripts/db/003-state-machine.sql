-- ============================================
-- NXTPrism State Machine 테이블 (STEP 3)
-- ============================================

-- 1. 상태 머신 정의
CREATE TABLE IF NOT EXISTS state_machines (
  machine_id    TEXT NOT NULL,
  version       TEXT NOT NULL,
  name          TEXT NOT NULL,
  domain        TEXT NOT NULL,
  definition    JSONB NOT NULL,
  registered_by TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (machine_id, version)
);

ALTER TABLE state_machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "state_machines_all" ON state_machines FOR ALL USING (true) WITH CHECK (true);

-- 2. Gate Token (전이 승인 토큰)
CREATE TABLE IF NOT EXISTS gate_tokens (
  token_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
  machine_id      TEXT NOT NULL,
  machine_version TEXT NOT NULL,
  asset_type      TEXT NOT NULL,
  asset_id        TEXT NOT NULL,
  from_state      TEXT NOT NULL,
  to_state        TEXT NOT NULL,
  transition_id   TEXT NOT NULL,
  policy_version  TEXT,
  decision_id     TEXT,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED')),
  issued_by       TEXT NOT NULL
);

ALTER TABLE gate_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gate_tokens_all" ON gate_tokens FOR ALL USING (true) WITH CHECK (true);

-- 3. 전이 기록
CREATE TABLE IF NOT EXISTS transition_records (
  transition_record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(tenant_id),
  machine_id           TEXT NOT NULL,
  machine_version      TEXT NOT NULL,
  asset_type           TEXT NOT NULL,
  asset_id             TEXT NOT NULL,
  from_state           TEXT NOT NULL,
  to_state             TEXT NOT NULL,
  transition_id        TEXT NOT NULL,
  gate_token_id        UUID REFERENCES gate_tokens(token_id),
  gate_mode            TEXT NOT NULL CHECK (gate_mode IN ('HARD', 'SOFT', 'SHADOW')),
  result               TEXT NOT NULL CHECK (result IN ('COMMITTED', 'DENIED', 'OVERRIDDEN')),
  override_reason      TEXT,
  attestations         JSONB DEFAULT '[]'::jsonb,
  evidence_refs        JSONB DEFAULT '[]'::jsonb,
  policy_eval_ref      TEXT,
  triggered_by         TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transition_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transition_records_all" ON transition_records FOR ALL USING (true) WITH CHECK (true);

-- 4. 자산 현재 상태
CREATE TABLE IF NOT EXISTS asset_states (
  tenant_id          UUID NOT NULL REFERENCES tenants(tenant_id),
  machine_id         TEXT NOT NULL,
  asset_type         TEXT NOT NULL,
  asset_id           TEXT NOT NULL,
  current_state      TEXT NOT NULL,
  last_transition_id UUID REFERENCES transition_records(transition_record_id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, machine_id, asset_type, asset_id)
);

ALTER TABLE asset_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_states_all" ON asset_states FOR ALL USING (true) WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_gate_tokens_tenant ON gate_tokens(tenant_id, machine_id, status);
CREATE INDEX IF NOT EXISTS idx_transition_records_asset ON transition_records(tenant_id, machine_id, asset_type, asset_id);
CREATE INDEX IF NOT EXISTS idx_transition_records_time ON transition_records(created_at DESC);
