# NXTPrism Dashboard — 테스트 매뉴얼 (확장판)

> 작성일: 2026-02-10
> UI 업데이트: 2026-02-13 — ATC 콘솔 스타일 워크스페이스 리디자인

## 접속 URL

| 환경 | URL |
|------|-----|
| 대시보드 | https://nxtprism-dashboard.vercel.app |
| API 서버 | https://prism-api-production-a66f.up.railway.app |
| 로컬 UI | http://localhost:5173 |
| 로컬 API | http://localhost:3000 |

## 시드 데이터 요약

`seed-dashboard-data.ts` 실행 후 생성되는 데이터:

| 항목 | 건수 |
|------|------|
| 증거 레코드 (Evidence) | 37건 |
| 체크포인트 (Checkpoint) | 3건 |
| 상태 머신 (State Machine) | 1개 |
| 드론 (자산) | 6대 |
| Override | 6건 |
| 감사 보고서 (Export) | 8건 |

---

## 드론 6대 현황

| Asset ID | 현재 상태 | 시나리오 |
|----------|-----------|----------|
| `DRONE-001` | **GROUNDED** | 비행 중 진동 이상 → 제한구역 접근 → RTH → 착륙 → 3단계 전이로 GROUNDED |
| `DRONE-002` | **MONITORING** | 정상 비행 후 배터리 SOH 88.5% → 정책 평가 NO-GO → 모니터링 전환 |
| `DRONE-003` | **SERVICEABLE** | 배터리 교체 완료, 정상 비행 가능 (전이 없음, 초기 상태 유지) |
| `DRONE-004` | **RESTRICTED** | GPS 드리프트 5.7m 감지 → 긴급 착륙 → GPS 모듈 교체 → RESTRICTED 상태 대기 |
| `DRONE-005` | **MONITORING** | 비행 중 돌풍 35km/h → 기상 정책 NO-GO → 모니터링 전환 |
| `DRONE-006` | **GROUNDED** | 배터리 SOH 72.3% → 퇴화 경고 → 3단계 전이로 GROUNDED |

---

## Override 6건 현황

| # | Reason Code | 상태 | 설명 |
|---|-------------|------|------|
| 1 | `EMERGENCY_SAFETY` | PENDING/EXECUTED | DRONE-001 긴급 정비 이동 (2명 승인 시도) |
| 2 | `MAINTENANCE_REQUIRED` | PENDING_APPROVAL | DRONE-002 모터 교체 대기 운용 |
| 3 | `OPERATIONAL_NECESSITY` | REJECTED | 야간 배송 비행 연장 요청 (기상 조건 미충족) |
| 4 | `EMERGENCY_SAFETY` | PENDING_APPROVAL | DRONE-004 GPS 수리 후 복귀 (1/2 승인, 대기 중) |
| 5 | `MAINTENANCE_REQUIRED` | PENDING/EXECUTED | DRONE-006 배터리 교체 후 정비 투입 요청 |
| 6 | `OPERATIONAL_NECESSITY` | REJECTED | DRONE-005 기상 해제 전 긴급 배송 (돌풍 지속) |

---

## 증거 레코드 유형 (16종 37건)

| Event Type | 건수 | 설명 |
|------------|------|------|
| `PRE_FLIGHT_CHECK` | 6 | 비행 전 점검 (GO/NO-GO 결과 포함) |
| `TAKEOFF` | 2 | 이륙 기록 (웨이포인트, 고도, 방위) |
| `SENSOR_READING` | 7 | 센서 데이터 (드론 4대 + 기상관측소 2곳) |
| `ANOMALY_DETECTED` | 3 | 이상 감지 (진동, GPS, 배터리) |
| `GEOFENCE_ALERT` | 1 | 제한구역 접근 경고 |
| `LANDING_COMPLETE` | 2 | 착륙 완료 (비행시간, 거리, 정확도) |
| `EMERGENCY_LANDING` | 1 | 긴급 착륙 (GPS 신호 손실) |
| `POLICY_EVALUATION` | 2 | 정책 평가 결과 (NO-GO) |
| `MAINTENANCE_LOG` | 2 | 정비 기록 (배터리/GPS 모듈 교체) |
| `SYSTEM_AUDIT` | 2 | 시스템 무결성 검사 |
| `REGULATORY_REPORT` | 2 | 규제 보고 (국토부 월간 안전) |
| `FLEET_SUMMARY` | 1 | 운항 함대 요약 통계 |
| `FLEET_STATUS_UPDATE` | 1 | 함대 실시간 상태 |
| `COMMUNICATION_LOG` | 1 | 통신 로그 (RTH 명령 확인) |
| `AIRSPACE_CLEARANCE` | 1 | 공역 허가 |
| `SHIFT_HANDOVER` | 1 | 교대 인수인계 |
| `DAILY_SUMMARY` | 1 | 일일 요약 |

---

## UI 구조 (v2 — ATC 워크스페이스)

대시보드는 **상단 워크스페이스 탭** 5개로 구성된다 (사이드바 → 상단 탭 변경).

| # | 워크스페이스 | 경로 | 단축키 | 설명 |
|---|------------|------|--------|------|
| 1 | MONITOR | `/` | Alt+1 | 시스템 상태 + Alert Queue |
| 2 | EVIDENCE | `/evidence` | Alt+2 | 체인 브라우저 + 증거 인스펙터 |
| 3 | STATE & GATE | `/state` | Alt+3 | 자산 상태 + Gate Token 정보 |
| 4 | REPLAY | `/replay` | Alt+4 | 결정 재현 플레이어 |
| 5 | AUDIT | `/audit` | Alt+5 | 감사 보고서 + Audit Readiness |

**디자인 특징:**
- Orbitron + Exo 2 폰트 (ATC 콘솔 스타일)
- Glassmorphism (glass-panel, glass-card) + Glow 이펙트
- Radar grid 배경 + Noise overlay 텍스처
- 리사이즈 가능한 멀티패널 레이아웃 (드래그로 패널 크기 조절)
- Link Channel: 하단 상태바에 워크스페이스 간 공유 엔티티 표시

---

## 1. MONITOR 워크스페이스 테스트 (Overview)

### TC-OV-01: 시스템 상태 확인

1. MONITOR 워크스페이스 접속 (상단 탭 첫 번째 또는 Alt+1)
2. **좌측 패널** 확인 사항:
   - API Server 카드: `"ok"` + 타임스탬프 (녹색 glow)
   - Chain Integrity 카드: `"VALID"` (녹색 glow)
   - Override Summary 카드: 총 6건 이상 + status별 분포
   - Audit Exports 카드: 8건 이상
   - Recent Exports 테이블: 최근 감사 보고서 목록 (최대 10건)
3. **우측 패널 (Alert Queue)** 확인:
   - SYSTEM OK 알림 (녹색 glow border)
   - INTEGRITY VERIFIED 알림 (체인 유효 시)
   - OVERRIDE WARNING (PENDING_APPROVAL 있을 경우 — 주황색 glow)

### TC-OV-02: 새로고침

1. Refresh 버튼 클릭
2. 모든 데이터가 다시 로드되는지 확인

### TC-OV-03: 패널 리사이즈

1. 좌우 패널 사이 구분선을 드래그
2. 패널 크기가 조절되는지 확인

---

## 2. EVIDENCE 워크스페이스 테스트 (증거 체인)

### TC-EC-01: 체인 헤드 조회

1. EVIDENCE 워크스페이스 접속 (상단 탭 또는 Alt+2)
2. **좌측 패널 (Chain Browser)** 확인:
   - Chain Head 카드: 시퀀스 번호 50+ 이상, 최신 해시값 표시

### TC-EC-02: 체인 무결성 검증

1. **Verify** 버튼 클릭
2. 확인: `valid: true` (녹색 glow 뱃지), 검증 레코드 수 표시

### TC-EC-03: 체크포인트 생성

> **주의**: 시드 스크립트가 이미 모든 증거를 체크포인트로 커버했으므로, 바로 누르면 "No new evidence records since last checkpoint" 가 나옵니다. 아래 순서대로 테스트하세요.

1. 먼저 **API 직접 테스트 > API-04** 를 참고하여 증거를 1건 생성 (또는 다른 페이지에서 데이터 생성)
2. **Checkpoint** 버튼 클릭
3. 확인: `sequence_from/to`, `record_count`, `merkle_root`

### TC-EC-04: 증거 개별 조회 — DRONE-001 비행 전 점검

1. **우측 패널 (Evidence Inspector)** 에서 증거 ID 입력
   - Supabase에서 `evidence_records` 테이블 조회하여 ID 확인
2. 확인: `PRE_FLIGHT_CHECK` payload, `battery_soh: 94.2`

### TC-EC-05: 증거 개별 조회 — 긴급 착륙 기록

1. DRONE-004의 `EMERGENCY_LANDING` 증거 ID 입력
2. 확인: `GPS_SIGNAL_LOSS`, `coordinates`, `landing_type`

### TC-EC-06: 증거 개별 조회 — 시스템 감사

1. `SYSTEM_AUDIT` 증거 ID 입력
2. 확인: `PERIODIC_INTEGRITY_CHECK`, `records_checked`

---

## 3. STATE & GATE 워크스페이스 테스트 (자산 상태)

### TC-SM-01: DRONE-001 — GROUNDED (3단계 전이)

- **좌측 패널 (Asset Query)**: `drone-airworthiness` / `drone` / `DRONE-001` 입력 후 Query 클릭
- **확인**:
  - 현재 상태: **GROUNDED** (빨간색 glow)
  - State Flow: 5개 상태 노드 중 GROUNDED에 aqua glow
  - 전이 이력 3건:
    1. `SERVICEABLE` → `MONITORING` (health-monitor)
    2. `MONITORING` → `RESTRICTED` (policy-engine)
    3. `RESTRICTED` → `GROUNDED` (ops-controller-lee)
- **우측 패널 (Gate Token & Overrides)**: Asset Info에 상태 표시, Override Governance 링크

### TC-SM-02: DRONE-002 — MONITORING (1단계 전이)

- **입력**: `drone-airworthiness` / `drone` / `DRONE-002`
- **확인**:
  - 현재 상태: **MONITORING** (노란색)
  - 전이 이력 1건

### TC-SM-03: DRONE-003 — SERVICEABLE (전이 없음)

- **입력**: `drone-airworthiness` / `drone` / `DRONE-003`
- **확인**:
  - 현재 상태: **SERVICEABLE** (녹색)
  - 전이 이력: 없음

### TC-SM-04: DRONE-004 — RESTRICTED (GPS 문제)

- **입력**: `drone-airworthiness` / `drone` / `DRONE-004`
- **확인**:
  - 현재 상태: **RESTRICTED** (주황색)
  - 전이 이력 2건:
    1. `SERVICEABLE` → `MONITORING` (nav-monitor)
    2. `MONITORING` → `RESTRICTED` (policy-engine)

### TC-SM-05: DRONE-005 — MONITORING (기상 경고)

- **입력**: `drone-airworthiness` / `drone` / `DRONE-005`
- **확인**:
  - 현재 상태: **MONITORING** (노란색)
  - 전이 이력 1건: `SERVICEABLE` → `MONITORING` (wx-monitor)

### TC-SM-06: DRONE-006 — GROUNDED (배터리 퇴화)

- **입력**: `drone-airworthiness` / `drone` / `DRONE-006`
- **확인**:
  - 현재 상태: **GROUNDED** (빨간색)
  - 전이 이력 3건

### TC-SM-07: 존재하지 않는 자산

- **입력**: `drone-airworthiness` / `drone` / `DRONE-999`
- **확인**: 에러 메시지 또는 빈 결과

---

## 4. Override Governance (Override 관리) 테스트

> **접근 방법**: STATE & GATE 워크스페이스 우측 패널의 "Override Governance → View override requests" 링크 클릭, 또는 브라우저에서 `/overrides` 직접 접속

### TC-OG-01: KPI 대시보드

- **확인**:
  - Total: 6건 이상
  - Pending: 2건+ (Override #2, #4)
  - Executed: 2건+ (Override #1, #5 — 승인 성공 시)
  - Rejected: 2건 (Override #3, #6)
  - Reason Code 분포: `EMERGENCY_SAFETY`, `MAINTENANCE_REQUIRED`, `OPERATIONAL_NECESSITY`

### TC-OG-02: 상태별 필터링 — PENDING_APPROVAL

1. 드롭다운에서 `PENDING_APPROVAL` 선택
2. 확인: Override #2 (DRONE-002 모터 교체), #4 (DRONE-004 GPS 복귀) 표시

### TC-OG-03: 상태별 필터링 — REJECTED

1. 드롭다운에서 `REJECTED` 선택
2. 확인: Override #3, #6 표시
   - #3 거부 사유: *"야간 비행 기상 조건 미충족"*
   - #6 거부 사유: *"기상 경보 아직 해제되지 않음, 돌풍 35km/h 지속"*

### TC-OG-04: Override 상세 보기 — 부분 승인

1. Override #4 행 클릭 (확장)
2. 확인:
   - `reason_text`: "DRONE-004 GPS 모듈 교체 완료..."
   - 승인 1건: `MAINTENANCE_CONTROLLER` / `mx-chief-oh`
   - 미승인 1건: `SAFETY_OFFICER` 대기

### TC-OG-05: Override 상세 보기 — 거부된 Override

1. Override #6 행 클릭 (확장)
2. 확인:
   - `reason_text`: "DRONE-005 기상 악화 해제 전 긴급 배송..."
   - 거부자: `safety-kim`
   - 거부 사유 표시

---

## 5. AUDIT 워크스페이스 테스트 (감사 보고서)

### TC-AR-01: 기존 보고서 목록 확인

1. AUDIT 워크스페이스 접속 (상단 탭 또는 Alt+5)
2. **좌측 패널** 확인:
   - Export History 테이블에 8건 이상 표시
   - 4종 x 2세트 (`seed-script` / `compliance-officer`)

### TC-AR-02: AUDIT_REPORT 생성

1. **Audit Report** 버튼 클릭
2. 확인: 새 보고서 생성, Result 카드에 ReportViewer + JSON 표시, 테이블에 추가

### TC-AR-03: CHAIN_AUDIT 생성

1. **Chain Audit** 버튼 클릭
2. 확인: `valid` 필드 포함 보고서 생성

### TC-AR-04: COMPLIANCE_SNAPSHOT 생성

1. **Compliance** 버튼 클릭
2. 확인: 규정 준수 스냅샷 보고서 생성

### TC-AR-05: OVERRIDE_HISTORY 생성

1. **Override History** 버튼 클릭
2. 확인: 6건 Override 내역 포함

### TC-AR-06: 보고서 상세 보기

1. Export History에서 아무 행 클릭 (확장)
2. 확인: JSON 뷰어, `report_hash`, ReportViewer

### TC-AR-07: Audit Readiness 확인 (신규)

1. **우측 패널 (Audit Readiness)** 확인:
   - Chain Integrity: VALID/INVALID 뱃지 + 레코드 수
   - Override KPIs: Total, Avg Approval 시간, status별 분포
   - Export Stats: 총 Export 수, Report Types 수
   - **Readiness Score**: 0~100% (체인 무결성 40% + Override 거버넌스 30% + Export 커버리지 30%)

---

## 6. REPLAY 워크스페이스 테스트 (결정 재현)

### TC-RP-01: 플레이어 UI 확인

1. REPLAY 워크스페이스 접속 (상단 탭 또는 Alt+4)
2. 확인:
   - 플레이어 컨트롤: Step Back / Play / Step Forward 버튼
   - As-Was / As-Is 비교 토글 버튼
   - 타임라인 프로그레스 바
   - Empty State: "결정 재현 데이터 없음" 메시지

> **참고**: 현재 REPLAY 워크스페이스는 플레이어 UI 셸만 구현됨. API 연동은 향후 업데이트 예정.

---

## 7. 공통 UI 테스트

### TC-UI-01: 키보드 단축키

1. Alt+1 ~ Alt+5 키 입력
2. 확인: 해당 워크스페이스로 즉시 전환

### TC-UI-02: 언어 전환

1. 상단 바 우측의 KO/EN 버튼 클릭
2. 확인: 전체 UI 텍스트가 한국어 ↔ 영어로 전환

### TC-UI-03: 패널 리사이즈

1. 각 워크스페이스에서 좌우 패널 구분선 드래그
2. 확인: 패널 크기가 부드럽게 조절됨

### TC-UI-04: 반응형 확인

1. 브라우저 창 크기를 줄이거나 모바일 뷰로 전환
2. 확인: 레이아웃이 깨지지 않고 적응

---

## API 직접 테스트

> **GET 요청** → 브라우저 주소창에 URL을 붙여넣기만 하면 됩니다.
> **POST 요청** → 터미널(PowerShell/Git Bash)에서 curl 명령어를 복사해서 실행하세요.

### API-01: 헬스체크 (브라우저)

브라우저 주소창에 붙여넣기:
```
https://prism-api-production-a66f.up.railway.app/health
```

### API-02: 체인 헤드 (브라우저)

```
https://prism-api-production-a66f.up.railway.app/v1/chains/00000000-0000-0000-0000-000000000001/head
```

### API-03: 체인 검증

**브라우저 콘솔** (`F12` → Console):
```js
fetch("https://prism-api-production-a66f.up.railway.app/v1/chains/00000000-0000-0000-0000-000000000001/verify", { method: "POST" }).then(r => r.json()).then(console.log)
```

### API-04: 증거 생성

**방법 1) 브라우저 콘솔** — 대시보드 페이지(https://nxtprism-dashboard.vercel.app)에서 `F12` → Console 탭에 붙여넣기:

```js
fetch("https://prism-api-production-a66f.up.railway.app/v1/evidence/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tenant_id: "00000000-0000-0000-0000-000000000001",
    payload: { event_type: "MANUAL_TEST", description: "수동 테스트용 증거", tester: "manual-test" },
    created_by: "test-user"
  })
}).then(r => r.json()).then(console.log)
```

**방법 2) PowerShell** — VS Code 터미널 또는 Windows PowerShell에서:

```powershell
Invoke-RestMethod -Method POST -Uri "https://prism-api-production-a66f.up.railway.app/v1/evidence/create" -ContentType "application/json" -Body '{"tenant_id":"00000000-0000-0000-0000-000000000001","payload":{"event_type":"MANUAL_TEST","description":"수동 테스트용 증거","tester":"manual-test"},"created_by":"test-user"}'
```

### API-05: 자산 상태 조회 (브라우저)

아래 URL 중 하나를 브라우저에 붙여넣기:
```
https://prism-api-production-a66f.up.railway.app/v1/state-machines/drone-airworthiness/assets/drone/DRONE-001/state?tenant_id=00000000-0000-0000-0000-000000000001
https://prism-api-production-a66f.up.railway.app/v1/state-machines/drone-airworthiness/assets/drone/DRONE-002/state?tenant_id=00000000-0000-0000-0000-000000000001
https://prism-api-production-a66f.up.railway.app/v1/state-machines/drone-airworthiness/assets/drone/DRONE-003/state?tenant_id=00000000-0000-0000-0000-000000000001
https://prism-api-production-a66f.up.railway.app/v1/state-machines/drone-airworthiness/assets/drone/DRONE-004/state?tenant_id=00000000-0000-0000-0000-000000000001
https://prism-api-production-a66f.up.railway.app/v1/state-machines/drone-airworthiness/assets/drone/DRONE-005/state?tenant_id=00000000-0000-0000-0000-000000000001
https://prism-api-production-a66f.up.railway.app/v1/state-machines/drone-airworthiness/assets/drone/DRONE-006/state?tenant_id=00000000-0000-0000-0000-000000000001
```

### API-06: 전이 이력 조회 (브라우저)

```
https://prism-api-production-a66f.up.railway.app/v1/state-machines/drone-airworthiness/assets/drone/DRONE-001/history?tenant_id=00000000-0000-0000-0000-000000000001
```

### API-07: Override 목록 (브라우저)

```
https://prism-api-production-a66f.up.railway.app/v1/overrides?tenant_id=00000000-0000-0000-0000-000000000001
```

### API-08: Override 상태별 조회 (브라우저)

```
https://prism-api-production-a66f.up.railway.app/v1/overrides?tenant_id=00000000-0000-0000-0000-000000000001&status=PENDING_APPROVAL
https://prism-api-production-a66f.up.railway.app/v1/overrides?tenant_id=00000000-0000-0000-0000-000000000001&status=REJECTED
```

### API-09: Override KPI (브라우저)

```
https://prism-api-production-a66f.up.railway.app/v1/overrides/kpis?tenant_id=00000000-0000-0000-0000-000000000001
```

### API-10: 감사 보고서 생성

**브라우저 콘솔** (`F12` → Console):
```js
fetch("https://prism-api-production-a66f.up.railway.app/v1/exports/audit-report", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ tenant_id: "00000000-0000-0000-0000-000000000001", requested_by: "manual-test" })
}).then(r => r.json()).then(console.log)
```

### API-11: 내보내기 목록 (브라우저)

```
https://prism-api-production-a66f.up.railway.app/v1/exports?tenant_id=00000000-0000-0000-0000-000000000001
```

---

## 시드 데이터 재실행 방법

```bash
# 1. 로컬 API 서버 시작
cd apps/prism-api && pnpm dev

# 2. 시드 스크립트 실행
npx tsx scripts/seed-dashboard-data.ts
```

> **주의:**
> - 중복 실행 시 증거, 체크포인트, Override가 추가 생성됨
> - 상태 머신 등록은 이미 존재 시 스킵
> - 상태 전이는 현재 상태와 맞지 않으면 실패 가능
