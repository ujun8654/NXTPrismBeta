# NXTPrism DB & System Guide

> 최종 업데이트: 2026-02-11
> 이 문서는 NXTPrism의 모든 DB 테이블, 패키지, API 엔드포인트를 기록한다.

---

## 1. 시스템 개요

NXTPrism은 **Trust & Evidence Infrastructure**로, AI와 운영 시스템의 의사결정을 **기록하고, 엮고, 판단하고, 증명**하는 플랫폼이다.

```
외부 시스템 (드론, 센서, 운영앱)       브라우저
        │                              │
        │  데이터 전송 (REST API)       │  Dashboard (React)
        ▼                              ▼
┌──────────────────────────────────────────┐
│              NXTPrism API Server          │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Evidence  │  │  Policy  │  │ State  │ │
│  │  Ledger   │  │  Engine  │  │Machine │ │
│  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │              │            │      │
│       └──────────────┼────────────┘      │
│                      │                   │
│              Supabase (PostgreSQL)        │
└──────────────────────────────────────────┘
```

### 기술 스택
| 구분 | 기술 |
|------|------|
| 언어 | TypeScript |
| 런타임 | Node.js (tsx) |
| API 서버 | Fastify |
| 데이터베이스 | Supabase (PostgreSQL) |
| 해시 알고리즘 | SHA-256 |
| 패키지 관리 | pnpm (monorepo workspace) |
| 구조 | Modular Monolith |

---

## 2. 데이터베이스 테이블 (전체 11개)

### 2.1 `tenants` — 테넌트 (조직)

> **역할:** 멀티테넌트 격리. 모든 데이터는 tenant_id로 소유권이 구분된다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `tenant_id` | UUID (PK) | 테넌트 고유 ID |
| `name` | TEXT | 조직명 (예: "SkyLine UAM Corp.") |
| `isolation` | TEXT | 격리 방식 — `row` (기본) 또는 `schema` |
| `locale` | TEXT | 기본 언어 (예: "ko-KR") |
| `created_at` | TIMESTAMPTZ | 생성 시각 |

**왜 필요한가:** 하나의 NXTPrism 인스턴스에서 여러 조직의 데이터를 안전하게 분리하기 위해. 모든 테이블에 `tenant_id`가 들어가고, Row Level Security로 데이터가 격리된다.

---

### 2.2 `evidence_records` — 증거 기록 (해시체인)

> **역할:** NXTPrism의 핵심. 모든 의사결정·이벤트를 해시체인으로 연결하여 변조 불가능하게 기록한다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `evidence_id` | UUID (PK) | 증거 고유 ID |
| `tenant_id` | UUID (FK → tenants) | 소속 테넌트 |
| `sequence_num` | INTEGER | 테넌트 내 순번 (1, 2, 3, ...) |
| `prev_hash` | TEXT | 이전 증거의 chain_hash (첫 번째는 GENESIS) |
| `payload` | JSONB | 증거 본문 (자유 형식 JSON) |
| `payload_hash` | TEXT | payload를 SHA-256 해시한 값 |
| `chain_hash` | TEXT | `SHA256(prev_hash \| payload_hash \| metadata_hash)` |
| `decision_id` | TEXT (nullable) | 관련 의사결정 ID |
| `policy_version_id` | TEXT (nullable) | 판단에 사용된 정책 버전 |
| `state_transition_id` | TEXT (nullable) | 관련 상태 전이 ID |
| `attestation_refs` | JSONB | 승인자 정보 배열 |
| `created_by` | TEXT (nullable) | 생성 주체 |
| `created_at` | TIMESTAMPTZ | 생성 시각 |

**왜 필요한가:** "그때 왜 그런 결정을 했는가?"를 나중에 증명할 수 있으려면, 결정 당시의 데이터가 변조되지 않았음을 보장해야 한다. 해시체인은 하나의 레코드라도 바뀌면 그 이후 전체 체인이 깨지기 때문에 변조를 즉시 탐지할 수 있다.

**해시체인 동작 원리:**
```
Record 1: chain_hash = SHA256(GENESIS | payload_hash_1 | meta_hash_1)
Record 2: chain_hash = SHA256(record_1.chain_hash | payload_hash_2 | meta_hash_2)
Record 3: chain_hash = SHA256(record_2.chain_hash | payload_hash_3 | meta_hash_3)
...
```
중간 레코드 하나를 바꾸면 → 그 이후 모든 chain_hash가 달라짐 → 검증 시 즉시 발견.

---

### 2.3 `checkpoints` — 머클 체크포인트

> **역할:** 증거 체인의 구간별 요약 (Merkle Root). 전체 체인을 다 읽지 않고도 특정 구간의 무결성을 빠르게 검증할 수 있다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `checkpoint_id` | UUID (PK) | 체크포인트 고유 ID |
| `tenant_id` | UUID (FK → tenants) | 소속 테넌트 |
| `sequence_from` | INTEGER | 포함 시작 순번 |
| `sequence_to` | INTEGER | 포함 끝 순번 |
| `merkle_root` | TEXT | 구간 내 모든 chain_hash의 Merkle Root |
| `head_hash` | TEXT | 구간 마지막 증거의 chain_hash |
| `record_count` | INTEGER | 포함된 증거 수 |
| `created_at` | TIMESTAMPTZ | 생성 시각 |

**왜 필요한가:** 증거가 수만 건이면 전체 검증에 시간이 오래 걸린다. 체크포인트를 만들어두면 "이 구간은 이미 검증됨"으로 빠르게 건너뛸 수 있다. 감사(Audit) 시 특정 기간만 검증할 때도 유용하다.

---

### 2.4 `policy_versions` — 정책 버전

> **역할:** GO/NO-GO 판단 규칙을 버전별로 저장. 한번 배포된 정책은 수정 불가(불변), 새 버전만 추가.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `policy_version_id` | UUID (PK) | 정책 버전 고유 ID |
| `policy_id` | TEXT | 정책 식별자 (예: "drone-flight-safety") |
| `version` | TEXT | 버전 (예: "v1.0.0") |
| `name` | TEXT | 정책명 |
| `description` | TEXT (nullable) | 설명 |
| `definition` | JSONB | 전체 정책 정의 (규칙 배열 포함) |
| `is_active` | BOOLEAN | 현재 활성 여부 |
| `published_at` | TIMESTAMPTZ | 배포 시각 |
| `published_by` | TEXT | 배포자 |

**UNIQUE 제약:** `(policy_id, version)` — 같은 정책의 같은 버전은 두 번 배포할 수 없다.

**왜 필요한가:** "3개월 전에는 어떤 규칙으로 판단했는가?"를 재현(Decision Replay)하려면, 과거 시점의 정책이 그대로 남아있어야 한다. 정책을 수정하면 과거 판단의 근거가 사라지기 때문에, 수정 대신 새 버전을 만든다.

**정책 구조 (definition 안):**
```json
{
  "rules": [
    {
      "rule_id": "R001",
      "name": "Battery SOH too low",
      "condition": { "operator": "LT", "field": "input.battery_soh", "value": 80 },
      "action": { "type": "DENY", "params": { "reason": "Battery SOH below 80%" } }
    }
  ]
}
```

---

### 2.5 `state_machines` — 상태 머신 정의

> **역할:** 자산(드론 등)의 상태 흐름 규칙을 정의. "어떤 상태에서 어떤 상태로 갈 수 있는지", "전이 조건이 뭔지"를 저장.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `machine_id` | TEXT (PK) | 머신 식별자 (예: "drone-airworthiness") |
| `version` | TEXT (PK) | 버전 (예: "v1.0.0") |
| `name` | TEXT | 머신명 |
| `domain` | TEXT | 도메인 (예: "airworthiness") |
| `definition` | JSONB | 전체 머신 정의 (상태 + 전이 규칙) |
| `registered_by` | TEXT | 등록자 |
| `created_at` | TIMESTAMPTZ | 생성 시각 |

**PK:** `(machine_id, version)` — 복합 키

**왜 필요한가:** "이 드론이 비행 가능 상태인지, 정비 중인지, 운항 금지인지"를 추적하려면 상태 머신이 필요하다. 아무렇게나 상태를 바꿀 수 없고, 정의된 전이만 가능하다.

**상태 흐름 예시 (drone-airworthiness):**
```
SERVICEABLE ←→ MONITORING
    ↓               ↓
RESTRICTED ←───────┘
    ↓
GROUNDED
    ↓
MAINTENANCE ──→ SERVICEABLE (RTS: Return to Service)
```

**전이 모드 3가지:**
| 모드 | 설명 |
|------|------|
| SHADOW | 제한 없이 전이. 기록만 남김 |
| SOFT | 기본 요건 검증. 실패 시 기록 후 진행 가능 |
| HARD | Gate Token 필수. 요건 미충족 시 전이 거부 |

---

### 2.6 `gate_tokens` — 전이 승인 토큰

> **역할:** HARD gate 전이에 필요한 일회용 승인 토큰. 전이 조건이 충족되었을 때 발급되며, 5분 TTL 후 만료.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `token_id` | UUID (PK) | 토큰 고유 ID |
| `tenant_id` | UUID (FK → tenants) | 소속 테넌트 |
| `machine_id` | TEXT | 상태 머신 ID |
| `machine_version` | TEXT | 머신 버전 |
| `asset_type` | TEXT | 자산 타입 (예: "drone") |
| `asset_id` | TEXT | 자산 ID (예: "DRONE-001") |
| `from_state` | TEXT | 출발 상태 |
| `to_state` | TEXT | 도착 상태 |
| `transition_id` | TEXT | 전이 정의 ID |
| `policy_version` | TEXT (nullable) | 관련 정책 버전 |
| `decision_id` | TEXT (nullable) | 관련 결정 ID |
| `issued_at` | TIMESTAMPTZ | 발급 시각 |
| `expires_at` | TIMESTAMPTZ | 만료 시각 |
| `status` | TEXT | 상태: `ACTIVE`, `USED`, `EXPIRED`, `REVOKED` |
| `issued_by` | TEXT | 발급자 |

**왜 필요한가:** 안전이 중요한 전이(예: 정비 완료 → 비행 가능)는 아무나 실행하면 안 된다. Gate Token은 "이 전이를 해도 된다"는 단기 승인증으로, 사용하면 소멸한다. 이를 통해 승인 없는 상태 변경(우회 전이)을 방지한다.

**흐름:**
```
1. 전이 요청 + 승인 정보 제출
2. 요건 충족 확인 → Gate Token 발급 (TTL 5분)
3. Token을 제출하며 전이 실행
4. Token 상태 → USED (재사용 불가)
```

---

### 2.7 `transition_records` — 전이 기록

> **역할:** 모든 상태 전이 시도를 기록. 성공(COMMITTED), 거부(DENIED), 강제(OVERRIDDEN) 전부 남긴다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `transition_record_id` | UUID (PK) | 전이 기록 고유 ID |
| `tenant_id` | UUID (FK → tenants) | 소속 테넌트 |
| `machine_id` | TEXT | 상태 머신 ID |
| `machine_version` | TEXT | 머신 버전 |
| `asset_type` | TEXT | 자산 타입 |
| `asset_id` | TEXT | 자산 ID |
| `from_state` | TEXT | 출발 상태 |
| `to_state` | TEXT | 도착 상태 |
| `transition_id` | TEXT | 전이 정의 ID |
| `gate_token_id` | UUID (FK → gate_tokens, nullable) | 사용된 Gate Token |
| `gate_mode` | TEXT | 적용된 게이트 모드: `HARD`, `SOFT`, `SHADOW` |
| `result` | TEXT | 결과: `COMMITTED`, `DENIED`, `OVERRIDDEN` |
| `override_reason` | TEXT (nullable) | Override 시 사유 |
| `attestations` | JSONB | 승인자 정보 배열 |
| `evidence_refs` | JSONB | 제출된 증거 참조 배열 |
| `policy_eval_ref` | TEXT (nullable) | 정책 평가 참조 |
| `triggered_by` | TEXT | 전이를 실행한 주체 |
| `created_at` | TIMESTAMPTZ | 실행 시각 |

**왜 필요한가:** 상태 변경의 모든 시도를 기록하는 것이 핵심. 성공뿐 아니라 거부된 시도도 남기기 때문에, "누가 언제 이 드론의 상태를 바꾸려 했고, 왜 거부/허용되었는지"를 추적할 수 있다. Override의 경우 사유까지 기록되므로 감사(Audit)에 활용된다.

**result 값:**
| 값 | 의미 |
|----|------|
| `COMMITTED` | 정상 전이 완료 |
| `DENIED` | 요건 미충족으로 거부됨 |
| `OVERRIDDEN` | 요건 불충분하지만 사유+승인자로 강제 전이 |

---

### 2.8 `asset_states` — 자산 현재 상태

> **역할:** 각 자산의 현재 상태를 추적. 전이가 완료될 때마다 자동으로 업데이트된다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `tenant_id` | UUID (PK, FK → tenants) | 소속 테넌트 |
| `machine_id` | TEXT (PK) | 상태 머신 ID |
| `asset_type` | TEXT (PK) | 자산 타입 |
| `asset_id` | TEXT (PK) | 자산 ID |
| `current_state` | TEXT | 현재 상태 (예: "SERVICEABLE") |
| `last_transition_id` | UUID (FK → transition_records) | 마지막 전이 기록 |
| `updated_at` | TIMESTAMPTZ | 마지막 업데이트 시각 |

**PK:** `(tenant_id, machine_id, asset_type, asset_id)` — 복합 키

**왜 필요한가:** "이 드론 지금 비행 가능해?"라는 질문에 즉시 답하기 위해. 전이 이력(transition_records)을 전부 뒤지지 않고, 이 테이블만 조회하면 현재 상태를 바로 알 수 있다.

---

### 2.9 `evidence_packs` — 증거 팩

> **역할:** 하나의 의사결정에 대한 모든 증거를 묶은 봉인 패키지. 결정, 정책 평가, 상태 전이, 서명, 무결성 정보를 하나의 JSON manifest로 통합한다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `pack_id` | UUID (PK) | 팩 고유 ID |
| `tenant_id` | UUID (FK → tenants) | 소속 테넌트 |
| `decision_id` | TEXT (UNIQUE) | 관련 의사결정 ID (1:1 매핑) |
| `pack_version` | TEXT | 팩 버전 (현재 "1.0") |
| `manifest` | JSONB | 전체 Evidence Pack JSON (EvidencePack 타입) |
| `pack_hash` | TEXT | manifest를 SHA-256 해시한 값 |
| `evidence_ids` | JSONB | 연결된 evidence_record ID 배열 |
| `created_at` | TIMESTAMPTZ | 생성 시각 |

**UNIQUE 제약:** `decision_id` — 하나의 의사결정에 대해 하나의 팩만 존재.

**왜 필요한가:** 감사(Audit)나 외부 제출 시, 하나의 결정에 대한 모든 근거를 한 덩어리로 추출할 수 있어야 한다. Evidence Pack은 결정 당시의 스냅샷을 봉인하며, pack_hash로 변조 여부를 즉시 검증할 수 있다.

**manifest 구조:**
```json
{
  "pack_version": "1.0",
  "decision": { "decision_id": "DEC-001", ... },
  "context_refs": [{ "uri": "s3://...", "hash": "sha256:..." }],
  "policy": { "policy_id": "...", "evaluation_result": { "allowed": true } },
  "state_transition": { "from": "IDLE", "to": "ACTIVE" },
  "attestations": [{ "type": "ORG_ATTESTATION", ... }],
  "integrity": { "prev_hash": "...", "chain_hash": "..." },
  "retention": { "class": "safety_critical", "min_retention_days": 3650 },
  "privacy": { "pii_class": "PII_NONE", "data_residency": "KR" }
}
```

---

### 2.10 `overrides` — Override 거버넌스

> **역할:** 강제 전이(Override) 요청·승인·실행을 추적. "예외는 허용, 침묵은 금지" 원칙의 핵심 테이블.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `override_id` | UUID (PK) | Override 고유 ID |
| `tenant_id` | UUID (FK → tenants) | 소속 테넌트 |
| `reason_code` | TEXT | 이유 코드 (EMERGENCY_SAFETY, MAINTENANCE_REQUIRED 등) |
| `reason_text` | TEXT | 상세 사유 |
| `impact_scope` | TEXT | 영향 범위 (single_asset / fleet / system) |
| `duration_minutes` | INTEGER | Override 유효 시간 (분) |
| `machine_id` | TEXT | 대상 상태 머신 |
| `asset_ref` | JSONB | 대상 자산 |
| `from_state` | TEXT | 출발 상태 |
| `to_state` | TEXT | 도착 상태 |
| `transition_record_id` | UUID (nullable) | 실행된 전이 기록 |
| `required_approvals` | JSONB | 필요한 승인 역할 목록 |
| `approvals` | JSONB | 승인 내역 배열 |
| `status` | TEXT | REQUESTED → PENDING_APPROVAL → APPROVED → EXECUTED |
| `evidence_pack_id` | UUID (nullable) | 생성된 Override Evidence Pack ID |
| `requested_by` | TEXT | 요청자 |
| `requested_at` | TIMESTAMPTZ | 요청 시각 |
| `resolved_at` | TIMESTAMPTZ (nullable) | 완료 시각 |

**왜 필요한가:** 안전 위험 상황에서 정상 절차를 우회해야 할 때, Override를 아무 기록 없이 하면 감사 추적이 불가능하다. 이 테이블은 누가, 왜, 언제 Override했는지 + 누가 승인했는지 + Evidence Pack까지 자동 생성하여 완전한 감사 추적을 보장한다.

**워크플로우:**
```
1. Override 요청 생성 → status: REQUESTED/PENDING_APPROVAL
2. 필요 역할 모두 승인 → status: APPROVED
3. 실행 → status: EXECUTED + Override Evidence Pack 자동 생성
```

### 2.11 `audit_exports` — 감사 보고서 내보내기

> **역할:** 생성된 감사 보고서를 DB에 저장. 누가 언제 어떤 보고서를 생성했는지 추적하고, 보고서 자체의 무결성도 해시로 보장.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `export_id` | UUID (PK) | 내보내기 고유 ID |
| `tenant_id` | UUID (FK → tenants) | 소속 테넌트 |
| `export_type` | TEXT | 보고서 유형 |
| `requested_by` | TEXT | 요청자 |
| `report` | JSONB | 보고서 본문 |
| `report_hash` | TEXT | 보고서 SHA-256 해시 |
| `created_at` | TIMESTAMPTZ | 생성 시각 |

**export_type 값:**
| 값 | 설명 |
|----|------|
| `AUDIT_REPORT` | 종합 감사 보고서 (체인 무결성 + 증거 통계 + Override KPI) |
| `DECISION_EXPORT` | 단일 결정 내보내기 (Evidence Pack + 연관 증거) |
| `CHAIN_AUDIT` | 체인 무결성 전수 감사 |
| `COMPLIANCE_SNAPSHOT` | 규정 준수 스냅샷 (자산 상태 + 활성 정책) |
| `OVERRIDE_HISTORY` | Override 이력 내보내기 |

**왜 필요한가:** 감사 보고서 자체도 감사 대상이다. "누가 언제 어떤 보고서를 뽑았는지"를 추적할 수 있어야 하고, report_hash로 보고서 변조 여부도 즉시 검증 가능하다.

---

## 3. 패키지 구조

```
NXTPrismBeta/
  packages/
    core-trust/          타입 정의 (Trust Object 모델)
    evidence-ledger/     해시체인 증거 원장
    policy-engine/       정책 평가 엔진
    state-machine/       상태 머신 + Gate Token
    evidence-pack/       증거 팩 (봉인 패키지)
    decision-replay/     결정 재현 (3가지 모드)
    override-governance/ Override 거버넌스 (다중 승인 + KPI)
    export-audit/        감사 보고서 내보내기 (5가지 보고서)
  apps/
    prism-api/           Fastify REST API 서버
    prism-ui/            React 대시보드 (Vite + Tailwind)
  scripts/
    db/                  DB 마이그레이션 SQL
    test-*.ts            각 패키지 테스트 스크립트
```

### 3.1 `core-trust` — Trust Object 타입

핵심 도메인 객체의 TypeScript 타입 정의. 다른 패키지에서 참조한다.

주요 타입: `Decision`, `EvidencePack`, `Attestation`, `StateTransition`, `PolicyRef`, `AssetRef`, `Integrity`, `Retention`, `Privacy`, `Tenant`

### 3.2 `evidence-ledger` — 증거 원장

| 기능 | 메서드 | 설명 |
|------|--------|------|
| 증거 추가 | `appendEvidence()` | 해시체인에 새 증거 연결 |
| 체인 헤드 조회 | `getChainHead()` | 최신 증거 조회 |
| 증거 조회 | `getEvidence()` | ID로 개별 증거 조회 |
| 체인 검증 | `verifyChain()` | 해시체인 무결성 검증 |
| 체크포인트 | `createCheckpoint()` | Merkle root 구간 요약 |

### 3.3 `policy-engine` — 정책 엔진

| 기능 | 메서드 | 설명 |
|------|--------|------|
| 정책 배포 | `publishPolicy()` | 정책 정의를 DB에 저장 (불변) |
| 활성 정책 조회 | `getActivePolicy()` | 현재 활성 정책 가져오기 |
| 정책 평가 | `evaluate()` | 데이터 vs 규칙 대조 → GO/NO-GO |
| ID로 평가 | `evaluateByPolicyId()` | DB에서 정책 로드 + 평가 |

**지원하는 조건 연산자:** `GT`, `GTE`, `LT`, `LTE`, `EQ`, `NEQ`, `IN`, `NOT_IN`, `AND`, `OR`

**판단 원칙: Deny-wins** — 하나라도 DENY면 최종 DENY.

### 3.4 `state-machine` — 상태 머신

| 기능 | 메서드 | 설명 |
|------|--------|------|
| 머신 등록 | `registerMachine()` | 상태 머신 정의 저장 |
| 머신 조회 | `getMachine()` | 머신 정의 가져오기 |
| 전이 승인 | `authorizeTransition()` | Gate Token 발급 |
| 전이 실행 | `commitTransition()` | 상태 전이 실행 + 기록 |
| 상태 조회 | `getAssetState()` | 자산 현재 상태 |
| 이력 조회 | `getTransitionHistory()` | 전이 이력 목록 |

### 3.5 `evidence-pack` — 증거 팩

| 기능 | 메서드 | 설명 |
|------|--------|------|
| 팩 생성 | `buildPack()` | 결정 증거를 묶어 봉인 팩 생성 |
| 팩 조회 (ID) | `getPack()` | pack_id로 조회 |
| 팩 조회 (결정) | `getPackByDecision()` | decision_id로 조회 |
| 팩 검증 | `verifyPack()` | manifest 해시 + 필수 필드 검증 |

**검증 항목:** hash_match, version_valid, context_refs_present, attestations_present

### 3.6 `decision-replay` — 결정 재현

| 기능 | 메서드 | 설명 |
|------|--------|------|
| 결정 재현 | `replay()` | 3가지 모드로 과거 결정 재현 |

**3가지 모드:**

| 모드 | 동작 |
|------|------|
| TRACE | Evidence Pack에서 원본 평가 결과만 추출 (재실행 없음) |
| DETERMINISTIC | 원본 정책 버전으로 재평가 → 원본과 일치 여부 확인 |
| FULL | 원본 + 현재 활성 정책 둘 다 재평가 → 정책 drift 분석 |

### 3.7 `override-governance` — Override 거버넌스

| 기능 | 메서드 | 설명 |
|------|--------|------|
| Override 생성 | `createOverride()` | Override 요청 생성 (required_approvals 없으면 즉시 APPROVED) |
| Override 승인 | `approveOverride()` | 역할별 승인 (모든 필수 역할 승인 시 → APPROVED) |
| Override 거부 | `rejectOverride()` | 거부 처리 + 사유 기록 |
| Override 실행 | `executeOverride()` | 만료·중복 체크 후 실행 + Override Evidence Pack 자동 생성 |
| Override 조회 | `getOverride()` | override_id로 조회 |
| 목록 조회 | `getOverridesByTenant()` | 테넌트별 Override 목록 (status 필터 가능) |
| KPI 조회 | `getOverrideKpis()` | 총 건수, status별/reason별/scope별 분포, 평균 승인 시간 |

**핵심 원칙: "예외는 허용, 침묵은 금지"**
- Override 실행 시 Evidence Pack이 자동 생성됨 (기록 없는 Override 불가)
- Break-glass: 복수 역할의 승인이 모두 필요한 다중 승인 지원
- 만료 방지: duration_minutes 초과 시 실행 거부 + EXPIRED 처리
- 중복 방지: 이미 EXECUTED된 Override는 재실행 불가

### 3.8 `export-audit` — 감사 보고서 내보내기

| 기능 | 메서드 | 설명 |
|------|--------|------|
| 종합 감사 보고서 | `generateAuditReport()` | 체인 무결성 + 증거 통계 + 정책 이력 + Override KPI + 전이 요약 |
| 단일 결정 내보내기 | `exportDecision()` | Evidence Pack manifest + 연관 증거 |
| 체인 무결성 감사 | `auditChainIntegrity()` | 해시체인 전수 검증 + 체크포인트 확인 |
| 규정 준수 스냅샷 | `generateComplianceSnapshot()` | 자산 상태 + 활성 정책 + Override 현황 |
| Override 이력 내보내기 | `exportOverrideHistory()` | Override 전체 이력 + KPI |
| 내보내기 조회 | `getExport()` | export_id로 이전 보고서 재조회 |
| 내보내기 목록 | `getExportsByTenant()` | 테넌트별 내보내기 이력 |

**핵심 특징:**
- 모든 보고서는 DB에 자동 저장 + SHA-256 해시로 무결성 보장
- 7개 데이터 소스를 병렬 수집 (Promise.all)하여 종합 보고서 생성
- 보고서 자체가 감사 대상 — "누가 언제 어떤 보고서를 생성했는지" 추적 가능

---

## 4. API 엔드포인트

### 4.1 기본
| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |

### 4.2 Evidence (증거)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/v1/evidence/create` | 증거 추가 |
| GET | `/v1/evidence/:evidence_id` | 증거 조회 |

### 4.3 Chain (체인)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/v1/chains/:tenant_id/head` | 체인 헤드 조회 |
| POST | `/v1/chains/:tenant_id/verify` | 체인 무결성 검증 |
| POST | `/v1/chains/:tenant_id/checkpoint` | 체크포인트 생성 |

### 4.4 Policy (정책)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/v1/policies/publish` | 정책 배포 |
| GET | `/v1/policies/:policy_id/active` | 활성 정책 조회 |
| POST | `/v1/policies/:policy_id/evaluate` | 정책 평가 |

### 4.5 State Machine (상태 머신)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/v1/state-machines/register` | 머신 정의 등록 |
| GET | `/v1/state-machines/:machine_id` | 머신 정의 조회 |
| POST | `/v1/state-machines/:machine_id/transitions/authorize` | Gate Token 발급 |
| POST | `/v1/state-machines/:machine_id/transitions/commit` | 전이 실행 |
| GET | `/v1/state-machines/:machine_id/assets/:type/:id/state` | 자산 상태 조회 |
| GET | `/v1/state-machines/:machine_id/assets/:type/:id/history` | 전이 이력 조회 |

### 4.6 Evidence Pack (증거 팩)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/v1/evidence-packs/build` | Evidence Pack 생성 |
| GET | `/v1/decisions/:decision_id/evidence-pack` | Decision ID로 팩 조회 |
| POST | `/v1/evidence-packs/verify` | 팩 무결성 검증 |

### 4.7 Decision Replay (결정 재현)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/v1/decisions/:decision_id/replay` | 결정 재현 (TRACE/DETERMINISTIC/FULL) |

### 4.8 Override Governance (Override 거버넌스)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/v1/overrides/create` | Override 요청 생성 |
| GET | `/v1/overrides/:override_id` | Override 조회 |
| POST | `/v1/overrides/:override_id/approve` | Override 승인 |
| POST | `/v1/overrides/:override_id/reject` | Override 거부 |
| GET | `/v1/overrides?tenant_id=...` | Override 목록 조회 |
| GET | `/v1/overrides/kpis?tenant_id=...` | Override KPI 조회 |

### 4.9 Export & Audit Report (감사 보고서)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/v1/exports/audit-report` | 종합 감사 보고서 생성 |
| POST | `/v1/exports/decision-export` | 단일 결정 내보내기 |
| POST | `/v1/exports/chain-audit` | 체인 무결성 감사 |
| POST | `/v1/exports/compliance-snapshot` | 규정 준수 스냅샷 |
| POST | `/v1/exports/override-history` | Override 이력 내보내기 |
| GET | `/v1/exports/:export_id` | 이전 내보내기 조회 |
| GET | `/v1/exports?tenant_id=...` | 내보내기 이력 목록 |

### 3.9 `prism-ui` — 대시보드 UI

React 18 + Vite + Tailwind CSS 기반의 ATC 터미널 스타일 대시보드.

**5개 페이지:**

| 페이지 | 경로 | 설명 |
|--------|------|------|
| Overview | `/` | 헬스체크, 체인 무결성, Override KPI, 최근 보고서 |
| Evidence Chain | `/evidence` | 체인 헤드, 무결성 검증, 체크포인트 생성, 증거 조회 |
| State Machine | `/state` | 자산 상태 조회, 전이 이력, 상태 플로우 시각화 |
| Override Governance | `/overrides` | Override 목록, KPI 대시보드, 상세 조회 |
| Audit Reports | `/reports` | 5가지 보고서 생성 버튼, 내보내기 목록, JSON 뷰어 |

**기술 스택:** React 18, Vite 5, Tailwind CSS 3, React Router 6
**디자인:** FAA HF-STD-010A 기반 ATC 다크 테마 + CVD 3중 부호화 (§10 참조)

---

## 5. 테이블 관계도

```
tenants
  │
  ├── evidence_records (tenant_id FK)
  │     └── checkpoints (tenant_id FK)
  │
  ├── gate_tokens (tenant_id FK)
  │
  ├── transition_records (tenant_id FK)
  │     ├── gate_tokens (gate_token_id FK)
  │     └── asset_states (last_transition_id FK)
  │
  ├── asset_states (tenant_id FK)
  │
  ├── evidence_packs (tenant_id FK)
  │     └── decision_id로 Decision Replay에서 참조
  │
  ├── overrides (tenant_id FK)
  │     ├── evidence_pack_id → evidence_packs
  │     └── transition_record_id → transition_records
  │
  └── audit_exports (tenant_id FK)
        └── report_hash로 보고서 무결성 검증

policy_versions (독립 — evidence_records.policy_version_id로 참조)
state_machines (독립 — transition_records.machine_id로 참조)
```

---

## 6. 현재 구현 상태 (2026-02-11)

| STEP | 기능 | 상태 | 비고 |
|------|------|------|------|
| STEP 1 | Evidence Ledger + API | 완료 | 해시체인, 머클 체크포인트, 8개 테스트 PASS |
| STEP 2 | Policy Engine + API | 완료 | 규칙 기반 GO/NO-GO, 6개 테스트 PASS |
| STEP 3 | State Machine + Gate Token + API | 완료 | 상태 전이, HARD/SOFT/SHADOW gate, Override, 10개 테스트 PASS |
| STEP 5 | Evidence Pack + API | 완료 | 증거 봉인 패키지, 해시 검증, 7개 테스트 PASS |
| STEP 6 | Decision Replay + API | 완료 | TRACE/DETERMINISTIC/FULL 3모드, 정책 drift 분석, 6개 테스트 PASS |
| STEP 7 | Override Governance | 완료 | 다중 승인, Evidence Pack 자동 생성, KPI 추적, 만료/중복 방지, 8개 테스트 PASS |
| STEP 8 | Export + Audit Report | 완료 | 5가지 보고서, 해시 무결성, DB 저장, 7개 테스트 PASS |
| STEP 9 | Dashboard UI | 완료 | React 18 + Vite + Tailwind, ATC 다크 테마, 5개 페이지 |
| STEP 10 | Deployment | 완료 | Vercel (UI) + Railway (API) + Supabase (DB) |

> **참고:** STEP 4는 아키텍처 스펙에 별도 정의 없음 (번호 건너뜀).

---

## 7. 배포 (Deployment)

| 서비스 | 플랫폼 | URL |
|--------|--------|-----|
| Dashboard UI | Vercel | https://nxtprism-dashboard.vercel.app |
| API Server | Railway | https://prism-api-production-a66f.up.railway.app |
| Database | Supabase | (콘솔에서 접속) |

- Vercel: GitHub push 시 자동 빌드/배포 (monorepo — `apps/prism-ui`)
- Railway: GitHub push 시 자동 빌드/배포 (Build: `pnpm install`, Start: `cd apps/prism-api && pnpm start`)
- Railway 환경변수: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Vercel 환경변수: `VITE_API_URL` (Railway API URL)

---

## 8. GitHub 저장소

- **URL:** https://github.com/ujun8654/NXTPrismBeta (Private)
- **브랜치:** `main`
- **제외 파일:** `.env`, `node_modules/`, `.vercel/`, `*.pptx`, `*.pdf`, `nul`

---

## 9. 환경 설정

```
# .env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
```

**개발용 테넌트:**
- tenant_id: `00000000-0000-0000-0000-000000000001`
- name: `SkyLine UAM Corp.`

**서버 실행:**
```bash
cd apps/prism-api && pnpm dev
# → http://localhost:3000
```

**대시보드 실행:**
```bash
cd apps/prism-ui && pnpm dev
# → http://localhost:5173
# (API 서버가 먼저 실행되어 있어야 함)
```

**테스트 실행:**
```bash
npx tsx scripts/test-evidence-ledger.ts    # 8 tests
npx tsx scripts/test-policy-engine.ts      # 6 tests
npx tsx scripts/test-state-machine.ts      # 10 tests
npx tsx scripts/test-evidence-pack.ts      # 7 tests
npx tsx scripts/test-decision-replay.ts    # 6 tests
npx tsx scripts/test-override-governance.ts # 8 tests
npx tsx scripts/test-export-audit.ts       # 7 tests
```

**데모 스크립트:**
```bash
npx tsx scripts/integrated-demo.ts         # 전체 엔진 통합 시나리오
npx tsx scripts/tamper-detection-demo.ts   # 변조 탐지 데모
npx tsx scripts/verify-chain.ts            # 체인 무결성 검증
```

**시드 데이터 (대시보드 테스트용):**
```bash
npx tsx scripts/seed-dashboard-data.ts     # 37 증거 + 6 드론 + 6 Override + 8 보고서
```
> API 서버(`pnpm dev`)가 실행 중이어야 함. 테스트 매뉴얼은 `dashboard-test-manual.md` 참조.

---

## 10. UI 디자인 시스템 (FAA HF-STD-010A)

대시보드 색상 체계는 **FAA HF-STD-010A** (항공관제 화면 표준)에 기반한다.
CVD(색각 이상) 접근성을 위해 **색상 + 아이콘 + 텍스트** 3중 부호화를 적용한다.

### 10.1 컬러 팔레트

**전경 (Foreground)**

| 토큰 | Hex | 용도 |
|------|-----|------|
| `atc-white` | `#FFFFFF` | 기본 텍스트, 제목 |
| `atc-gray` | `#B3B3B3` | 보조 텍스트, 비활성 |
| `atc-blue` | `#5E8DF6` | 정보 (INFO) |
| `atc-aqua` | `#07CDED` | 보조 정보, 하이라이트 |
| `atc-green` | `#23E162` | 안전, 정상 (OK) |
| `atc-yellow` | `#DFF334` | 주의 (CAUTION) |
| `atc-orange` | `#FE930D` | 경고 (WARNING) |
| `atc-red` | `#FF1320` | 위험 (DANGER) |
| `atc-magenta` | `#D822FF` | 특수 강조 |
| `atc-pink` | `#F684D8` | 보조 강조 |
| `atc-brown` | `#C5955B` | 지형/보조 |

**배경 (Background)**

| 토큰 | Hex | 용도 |
|------|-----|------|
| `atc-black` | `#000000` | 메인 배경 |
| `atc-wx-green` | `#173928` | 날씨(Green) 배경 |
| `atc-wx-yellow` | `#5A4A14` | 날씨(Yellow) 배경 |
| `atc-wx-red` | `#5D2E59` | 날씨(Red) 배경 |

### 10.2 상태 뱃지 (StatusBadge)

CVD 접근성을 위해 각 상태에 고유 아이콘을 부여한다:

| 상태 | 색상 | 아이콘 | 의미 |
|------|------|--------|------|
| ok | `#23E162` (Green) | ✓ | 정상, 성공 |
| error | `#FF1320` (Red) | ✕ | 오류, 위험 |
| warn | `#FE930D` (Orange) | △ | 경고, 주의 |
| info | `#5E8DF6` (Blue) | ● | 정보 |
| neutral | `#B3B3B3` (Gray) | — | 비활성, 만료 |

### 10.3 Tailwind 설정

커스텀 토큰은 `tailwind.config.js`의 `theme.extend.colors.atc`에 정의되어 있다.
사용 예: `text-atc-white`, `bg-atc-black`, `text-atc-red`, `border-atc-blue`

### 10.4 접근성 원칙 (ISO 9241-210, ANSI Z535)

1. **색상만으로 의미 전달 금지** — 반드시 아이콘+텍스트 병행
2. **고대비** — True black (#000) 배경 + 고명도 전경색
3. **3중 부호화** — Color + Icon + Label로 상태 표현
4. **일관성** — 전 페이지 동일한 색상 의미 유지
