// ==============================================
// NXTPrism Dashboard — API 호출 유틸리티
// 로컬: Vite proxy /api → localhost:3000
// 배포: VITE_API_URL 환경변수로 Railway API 서버 직접 연결
// ==============================================

const API_BASE = import.meta.env.VITE_API_URL || '/api';
export const TENANT_ID = '00000000-0000-0000-0000-000000000001';

export async function apiCall<T = unknown>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ============ Health ============
export const getHealth = () =>
  apiCall<{ status: string; timestamp: string }>('GET', '/health');

// ============ Evidence ============
export const getEvidence = (evidenceId: string) =>
  apiCall('GET', `/v1/evidence/${evidenceId}`);

// ============ Chains ============
export const getChainHead = (tenantId = TENANT_ID) =>
  apiCall('GET', `/v1/chains/${tenantId}/head`);

export const verifyChain = (tenantId = TENANT_ID) =>
  apiCall('POST', `/v1/chains/${tenantId}/verify`);

export const createCheckpoint = (tenantId = TENANT_ID) =>
  apiCall('POST', `/v1/chains/${tenantId}/checkpoint`);

// ============ State Machines ============
export const getAssetState = (machineId: string, assetType: string, assetId: string, tenantId = TENANT_ID) =>
  apiCall('GET', `/v1/state-machines/${machineId}/assets/${assetType}/${assetId}/state?tenant_id=${tenantId}`);

export const getAssetHistory = (machineId: string, assetType: string, assetId: string, tenantId = TENANT_ID) =>
  apiCall('GET', `/v1/state-machines/${machineId}/assets/${assetType}/${assetId}/history?tenant_id=${tenantId}`);

// ============ Overrides ============
export const getOverrides = (tenantId = TENANT_ID, status?: string) =>
  apiCall('GET', `/v1/overrides?tenant_id=${tenantId}${status ? `&status=${status}` : ''}`);

export const getOverrideKpis = (tenantId = TENANT_ID) =>
  apiCall('GET', `/v1/overrides/kpis?tenant_id=${tenantId}`);

export const getOverrideDetail = (overrideId: string) =>
  apiCall('GET', `/v1/overrides/${overrideId}`);

// ============ Exports ============
export const generateAuditReport = (tenantId = TENANT_ID) =>
  apiCall('POST', '/v1/exports/audit-report', { tenant_id: tenantId, requested_by: 'dashboard' });

export const generateDecisionExport = (tenantId: string, decisionId: string) =>
  apiCall('POST', '/v1/exports/decision-export', { tenant_id: tenantId, decision_id: decisionId, requested_by: 'dashboard' });

export const generateChainAudit = (tenantId = TENANT_ID) =>
  apiCall('POST', '/v1/exports/chain-audit', { tenant_id: tenantId, requested_by: 'dashboard' });

export const generateComplianceSnapshot = (tenantId = TENANT_ID) =>
  apiCall('POST', '/v1/exports/compliance-snapshot', { tenant_id: tenantId, requested_by: 'dashboard' });

export const generateOverrideHistory = (tenantId = TENANT_ID) =>
  apiCall('POST', '/v1/exports/override-history', { tenant_id: tenantId, requested_by: 'dashboard' });

export const getExportList = (tenantId = TENANT_ID) =>
  apiCall('GET', `/v1/exports?tenant_id=${tenantId}`);

export const getExportDetail = (exportId: string) =>
  apiCall('GET', `/v1/exports/${exportId}`);
