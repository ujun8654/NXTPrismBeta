import { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'ko';

interface I18nCtx {
  lang: Lang;
  toggle: () => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Lang, string>> = {
  // ─── Nav / Layout ───
  'nav.overview': { en: 'Overview', ko: '개요' },
  'nav.evidence': { en: 'Evidence Chain', ko: '증거 체인' },
  'nav.state': { en: 'State Machine', ko: '상태 머신' },
  'nav.overrides': { en: 'Overrides', ko: '오버라이드' },
  'nav.reports': { en: 'Audit Reports', ko: '감사 보고서' },
  'lang.toggle': { en: '한국어', ko: 'English' },

  // ─── Common ───
  'common.refresh': { en: 'Refresh', ko: '새로고침' },
  'common.close': { en: 'Close', ko: '닫기' },
  'common.loading': { en: 'Loading...', ko: '로딩 중...' },
  'common.noData': { en: 'No data', ko: '데이터 없음' },
  'common.search': { en: 'Search', ko: '검색' },
  'common.query': { en: 'Query', ko: '조회' },
  'common.detail': { en: 'Detail', ko: '상세' },
  'common.view': { en: 'View', ko: '보기' },
  'common.processing': { en: 'Processing...', ko: '처리 중...' },
  'common.generating': { en: 'Generating...', ko: '생성 중...' },
  'common.success': { en: 'SUCCESS', ko: '성공' },
  'common.failed': { en: 'FAILED', ko: '실패' },
  'common.showJson': { en: 'Show JSON', ko: 'JSON 보기' },
  'common.type': { en: 'Type', ko: '유형' },
  'common.status': { en: 'Status', ko: '상태' },
  'common.time': { en: 'Time', ko: '시간' },
  'common.createdAt': { en: 'Created', ko: '생성일' },
  'common.by': { en: 'By', ko: '요청자' },

  // ─── Overview ───
  'overview.title': { en: 'Overview', ko: '시스템 개요' },
  'overview.desc': { en: 'System health and key metrics', ko: '시스템 상태 및 주요 지표' },
  'overview.apiServer': { en: 'API Server', ko: 'API 서버' },
  'overview.online': { en: 'ONLINE', ko: '정상' },
  'overview.offline': { en: 'OFFLINE', ko: '오프라인' },
  'overview.chainIntegrity': { en: 'Chain Integrity', ko: '체인 무결성' },
  'overview.valid': { en: 'VALID', ko: '정상' },
  'overview.tampered': { en: 'TAMPERED', ko: '위변조 감지' },
  'overview.overrideSummary': { en: 'Override Summary', ko: '오버라이드 현황' },
  'overview.auditExports': { en: 'Audit Exports', ko: '감사 보고서' },
  'overview.totalReports': { en: 'total reports', ko: '건' },
  'overview.recentExports': { en: 'Recent Exports', ko: '최근 보고서' },
  'overview.noExports': { en: 'No exports yet', ko: '생성된 보고서가 없습니다' },
  'overview.apiConnFailed': { en: 'API connection failed', ko: 'API 연결 실패' },
  'overview.headSeq': { en: 'Head: seq', ko: '헤드: seq' },

  // ─── Evidence Chain ───
  'evidence.title': { en: 'Evidence Chain', ko: '증거 체인' },
  'evidence.desc': { en: 'Hash chain integrity and evidence records', ko: '해시 체인 무결성 및 증거 레코드' },
  'evidence.chainHead': { en: 'Chain Head', ko: '체인 헤드 (최신 레코드)' },
  'evidence.seqNum': { en: 'Sequence #', ko: '시퀀스 번호' },
  'evidence.evidenceId': { en: 'Evidence ID', ko: '증거 ID' },
  'evidence.chainHash': { en: 'Chain Hash', ko: '체인 해시' },
  'evidence.noRecords': { en: 'No evidence records yet', ko: '증거 레코드가 없습니다' },
  'evidence.verify': { en: 'Verify Chain', ko: '체인 검증' },
  'evidence.verifyTitle': { en: 'Chain Verification', ko: '체인 무결성 검증' },
  'evidence.verifyDesc': { en: 'Verify the entire hash chain from first to last record', ko: '첫 번째 레코드부터 마지막까지 전체 해시 체인을 검증합니다' },
  'evidence.verifyValid': { en: 'Chain is VALID', ko: '체인이 정상입니다' },
  'evidence.verifyInvalid': { en: 'Chain is INVALID', ko: '체인 위변조가 감지되었습니다' },
  'evidence.recordsChecked': { en: 'records verified', ko: '개 레코드 검증 완료' },
  'evidence.invalidAt': { en: 'First invalid at sequence', ko: '위변조 감지 시퀀스' },
  'evidence.checkpoint': { en: 'Create Checkpoint', ko: '체크포인트 생성' },
  'evidence.checkpointTitle': { en: 'Merkle Checkpoint', ko: '머클 체크포인트' },
  'evidence.checkpointDesc': { en: 'Snapshot current evidence records into a Merkle tree', ko: '현재 증거 레코드들을 머클 트리로 스냅샷합니다' },
  'evidence.checkpointCreated': { en: 'Checkpoint created', ko: '체크포인트가 생성되었습니다' },
  'evidence.merkleRoot': { en: 'Merkle Root', ko: '머클 루트' },
  'evidence.sealedRange': { en: 'Sealed range', ko: '봉인 범위' },
  'evidence.recordCount': { en: 'records sealed', ko: '개 레코드 봉인' },
  'evidence.noNewRecords': { en: 'No new evidence records since last checkpoint', ko: '마지막 체크포인트 이후 새 증거가 없습니다' },
  'evidence.lookup': { en: 'Evidence Lookup', ko: '증거 조회' },
  'evidence.lookupPlaceholder': { en: 'Enter evidence_id...', ko: 'evidence_id를 입력하세요...' },
  'evidence.lookupDesc': { en: 'Look up a specific evidence record by ID', ko: 'ID로 특정 증거 레코드를 조회합니다' },
  'evidence.payload': { en: 'Payload', ko: '데이터' },
  'evidence.eventType': { en: 'Event Type', ko: '이벤트 유형' },

  // ─── State Machine ───
  'state.title': { en: 'State Machine', ko: '상태 머신' },
  'state.desc': { en: 'Asset state query and transition history', ko: '자산 상태 조회 및 전이 이력' },
  'state.assetQuery': { en: 'Asset Query', ko: '자산 조회' },
  'state.machineId': { en: 'Machine ID', ko: '머신 ID' },
  'state.assetType': { en: 'Asset Type', ko: '자산 유형' },
  'state.assetId': { en: 'Asset ID', ko: '자산 ID' },
  'state.currentState': { en: 'Current State', ko: '현재 상태' },
  'state.updated': { en: 'Updated', ko: '갱신 시간' },
  'state.stateFlow': { en: 'State Flow', ko: '상태 흐름' },
  'state.history': { en: 'Transition History', ko: '전이 이력' },
  'state.from': { en: 'From', ko: '이전' },
  'state.to': { en: 'To', ko: '이후' },
  'state.result': { en: 'Result', ko: '결과' },
  'state.gate': { en: 'Gate', ko: '게이트' },

  // State names
  'state.SERVICEABLE': { en: 'SERVICEABLE', ko: '운항 가능' },
  'state.MONITORING': { en: 'MONITORING', ko: '모니터링' },
  'state.GROUNDED': { en: 'GROUNDED', ko: '운항 정지' },
  'state.MAINTENANCE': { en: 'MAINTENANCE', ko: '정비 중' },
  'state.DECOMMISSIONED': { en: 'DECOMMISSIONED', ko: '퇴역' },

  // Result names
  'result.COMMITTED': { en: 'COMMITTED', ko: '확정' },
  'result.DENIED': { en: 'DENIED', ko: '거부' },
  'result.AUTHORIZED': { en: 'AUTHORIZED', ko: '승인' },

  // Gate names
  'gate.HARD': { en: 'HARD', ko: '강제' },
  'gate.SOFT': { en: 'SOFT', ko: '경고' },
  'gate.SHADOW': { en: 'SHADOW', ko: '감시' },

  // ─── Overrides ───
  'override.title': { en: 'Overrides', ko: '오버라이드' },
  'override.desc': { en: 'Override requests and KPI monitoring', ko: '오버라이드 요청 및 KPI 모니터링' },
  'override.total': { en: 'Total', ko: '전체' },
  'override.pending': { en: 'Pending', ko: '대기' },
  'override.executed': { en: 'Executed', ko: '실행됨' },
  'override.rejected': { en: 'Rejected', ko: '거부됨' },
  'override.avgApproval': { en: 'Avg Approval', ko: '평균 승인' },
  'override.byReason': { en: 'By Reason Code', ko: '사유별 현황' },
  'override.requests': { en: 'Override Requests', ko: '오버라이드 요청 목록' },
  'override.noOverrides': { en: 'No overrides found', ko: '오버라이드가 없습니다' },
  'override.reason': { en: 'Reason', ko: '사유' },
  'override.transition': { en: 'Transition', ko: '전이' },
  'override.detailTitle': { en: 'Override Detail', ko: '오버라이드 상세' },
  'override.requestedBy': { en: 'Requested by', ko: '요청자' },
  'override.requestedAt': { en: 'Requested at', ko: '요청 시간' },
  'override.approvals': { en: 'Approvals', ko: '승인 내역' },
  'override.noApprovals': { en: 'No approvals yet', ko: '승인 내역 없음' },
  'override.filter.all': { en: 'All', ko: '전체' },
  'override.filter.requested': { en: 'REQUESTED', ko: '요청됨' },
  'override.filter.pending': { en: 'PENDING', ko: '대기 중' },
  'override.filter.executed': { en: 'EXECUTED', ko: '실행됨' },
  'override.filter.rejected': { en: 'REJECTED', ko: '거부됨' },

  // Override statuses
  'status.EXECUTED': { en: 'EXECUTED', ko: '실행됨' },
  'status.REJECTED': { en: 'REJECTED', ko: '거부됨' },
  'status.PENDING_APPROVAL': { en: 'PENDING', ko: '승인 대기' },
  'status.REQUESTED': { en: 'REQUESTED', ko: '요청됨' },
  'status.EXPIRED': { en: 'EXPIRED', ko: '만료됨' },

  // ─── Audit Reports ───
  'report.title': { en: 'Audit Reports', ko: '감사 보고서' },
  'report.desc': { en: 'Generate and view audit reports', ko: '감사 보고서 생성 및 조회' },
  'report.AUDIT_REPORT': { en: 'Audit Report', ko: '종합 감사' },
  'report.AUDIT_REPORT.desc': { en: 'Full system audit', ko: '전체 시스템 감사' },
  'report.CHAIN_AUDIT': { en: 'Chain Audit', ko: '체인 감사' },
  'report.CHAIN_AUDIT.desc': { en: 'Hash chain integrity', ko: '해시 체인 무결성' },
  'report.COMPLIANCE': { en: 'Compliance', ko: '규정 준수' },
  'report.COMPLIANCE.desc': { en: 'Compliance snapshot', ko: '규정 준수 스냅샷' },
  'report.OVERRIDE': { en: 'Override History', ko: '오버라이드 이력' },
  'report.OVERRIDE.desc': { en: 'Override records', ko: '오버라이드 기록' },
  'report.result': { en: 'Result', ko: '결과' },
  'report.exportHistory': { en: 'Export History', ko: '내보내기 이력' },
  'report.noExports': { en: 'No exports yet', ko: '생성된 보고서가 없습니다' },
  'report.exportId': { en: 'Export ID', ko: '보고서 ID' },
  'report.hash': { en: 'Hash', ko: '해시' },
  'report.detailTitle': { en: 'Report Detail', ko: '보고서 상세' },
  'report.reportType': { en: 'Report Type', ko: '보고서 유형' },
  'report.hashIntegrity': { en: 'Hash Integrity', ko: '해시 무결성' },
  'report.content': { en: 'Report Content', ko: '보고서 내용' },
  'report.generatedSuccess': { en: 'Report generated successfully', ko: '보고서가 생성되었습니다' },
  'report.generatedFailed': { en: 'Report generation failed', ko: '보고서 생성에 실패했습니다' },
};

const I18nContext = createContext<I18nCtx>({
  lang: 'en',
  toggle: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  function toggle() {
    setLang((prev) => (prev === 'en' ? 'ko' : 'en'));
  }

  function t(key: string): string {
    return translations[key]?.[lang] ?? key;
  }

  return (
    <I18nContext.Provider value={{ lang, toggle, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
