import { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import JsonViewer from '../components/JsonViewer';
import {
  generateAuditReport,
  generateChainAudit,
  generateComplianceSnapshot,
  generateOverrideHistory,
  getExportList,
  getExportDetail,
} from '../api';

const REPORT_ACTIONS = [
  { key: 'AUDIT_REPORT', label: 'Audit Report', desc: '종합 감사 보고서', fn: generateAuditReport },
  { key: 'CHAIN_AUDIT', label: 'Chain Audit', desc: '체인 무결성 감사', fn: generateChainAudit },
  { key: 'COMPLIANCE_SNAPSHOT', label: 'Compliance', desc: '규정 준수 스냅샷', fn: generateComplianceSnapshot },
  { key: 'OVERRIDE_HISTORY', label: 'Override History', desc: 'Override 이력', fn: generateOverrideHistory },
];

export default function AuditReports() {
  const [exports, setExports] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExports();
  }, []);

  async function loadExports() {
    setLoading(true);
    try {
      const list = await getExportList();
      setExports((list as any[]) || []);
    } catch {}
    setLoading(false);
  }

  async function handleGenerate(key: string, fn: () => Promise<unknown>) {
    setGenerating(key);
    setResult(null);
    try {
      const r = await fn();
      setResult({ type: key, data: r });
      await loadExports(); // 목록 갱신
    } catch (e: any) {
      setResult({ type: key, error: e.message });
    }
    setGenerating(null);
  }

  async function handleViewDetail(exportId: string) {
    try {
      const detail = await getExportDetail(exportId);
      setSelected(detail);
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Audit Reports</h2>
        <p className="text-sm text-gray-500 mt-1">감사 보고서 생성 + 이전 내보내기 조회</p>
      </div>

      {/* 보고서 생성 버튼 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {REPORT_ACTIONS.map((action) => (
          <button
            key={action.key}
            onClick={() => handleGenerate(action.key, action.fn)}
            disabled={generating !== null}
            className="bg-gray-900/50 border border-gray-800 hover:border-green-400/30 rounded-lg p-4 text-left transition-colors disabled:opacity-50"
          >
            <div className="text-sm font-medium text-gray-200">{action.label}</div>
            <div className="text-xs text-gray-500 mt-1">{action.desc}</div>
            {generating === action.key && (
              <div className="text-xs text-green-400 mt-2">Generating...</div>
            )}
          </button>
        ))}
      </div>

      {/* 생성 결과 */}
      {result && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-gray-300">Generated Result</h3>
            <StatusBadge
              variant={result.error ? 'error' : 'ok'}
              label={result.error ? 'FAILED' : 'SUCCESS'}
            />
          </div>
          {result.error ? (
            <p className="text-red-400 text-sm">{result.error}</p>
          ) : (
            <JsonViewer data={result.data} defaultExpanded />
          )}
        </div>
      )}

      {/* 내보내기 목록 */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">Export History ({exports.length})</h3>
          <button
            onClick={loadExports}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-4 text-gray-500 text-sm">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-left px-4 py-2">Export ID</th>
                  <th className="text-left px-4 py-2">Hash</th>
                  <th className="text-left px-4 py-2">Requested By</th>
                  <th className="text-left px-4 py-2">Created</th>
                  <th className="text-left px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {exports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-600">
                      No exports yet — generate one above
                    </td>
                  </tr>
                ) : (
                  exports.map((ex: any) => (
                    <tr key={ex.export_id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2">
                        <StatusBadge variant="info" label={ex.export_type} />
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400 font-mono">
                        {ex.export_id?.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500 font-mono">
                        {ex.report_hash?.slice(0, 12)}...
                      </td>
                      <td className="px-4 py-2 text-gray-400">{ex.requested_by}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {new Date(ex.created_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleViewDetail(ex.export_id)}
                          className="text-xs text-green-400 hover:text-green-300"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 상세 보기 */}
      {selected && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">
              Export Detail — {(selected as any).export_id?.slice(0, 8)}...
            </h3>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3 text-xs">
            <div>
              <span className="text-gray-500">Type: </span>
              <span className="text-gray-300">{(selected as any).export_type}</span>
            </div>
            <div>
              <span className="text-gray-500">Hash: </span>
              <span className="text-gray-300 font-mono">{(selected as any).report_hash?.slice(0, 24)}...</span>
            </div>
            <div>
              <span className="text-gray-500">Created: </span>
              <span className="text-gray-300">{new Date((selected as any).created_at).toLocaleString('ko-KR')}</span>
            </div>
          </div>
          <JsonViewer data={(selected as any).report} title="Report Content" defaultExpanded />
        </div>
      )}
    </div>
  );
}
