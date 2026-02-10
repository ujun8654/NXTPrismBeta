import { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import JsonViewer from '../components/JsonViewer';
import {
  generateAuditReport, generateChainAudit, generateComplianceSnapshot, generateOverrideHistory,
  getExportList, getExportDetail,
} from '../api';

const REPORT_ACTIONS = [
  { key: 'AUDIT_REPORT', label: 'Audit Report', desc: 'Full system audit', fn: generateAuditReport },
  { key: 'CHAIN_AUDIT', label: 'Chain Audit', desc: 'Hash chain integrity', fn: generateChainAudit },
  { key: 'COMPLIANCE', label: 'Compliance', desc: 'Compliance snapshot', fn: generateComplianceSnapshot },
  { key: 'OVERRIDE', label: 'Override History', desc: 'Override records', fn: generateOverrideHistory },
];

export default function AuditReports() {
  const [exports, setExports] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadExports(); }, []);

  async function loadExports() {
    setLoading(true);
    try { setExports((await getExportList() as any[]) || []); } catch {}
    setLoading(false);
  }

  async function handleGenerate(key: string, fn: () => Promise<unknown>) {
    setGenerating(key); setResult(null);
    try {
      const r = await fn();
      setResult({ type: key, data: r });
      await loadExports();
    } catch (e: any) { setResult({ type: key, error: e.message }); }
    setGenerating(null);
  }

  async function handleViewDetail(exportId: string) {
    try { setSelected(await getExportDetail(exportId)); } catch {}
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-lg font-semibold text-white">Audit Reports</h2>
        <p className="text-xs text-neutral-500 mt-0.5">Generate and view audit reports</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {REPORT_ACTIONS.map((action) => (
          <button
            key={action.key}
            onClick={() => handleGenerate(action.key, action.fn)}
            disabled={generating !== null}
            className="bg-neutral-900/50 border border-neutral-800 hover:border-neutral-600 rounded-lg p-4 text-left transition-colors disabled:opacity-50"
          >
            <div className="text-xs font-medium text-neutral-200">{action.label}</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">{action.desc}</div>
            {generating === action.key && <div className="text-[11px] text-neutral-400 mt-2">Generating...</div>}
          </button>
        ))}
      </div>

      {result && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-medium text-neutral-400">Result</h3>
            <StatusBadge variant={result.error ? 'error' : 'ok'} label={result.error ? 'FAILED' : 'SUCCESS'} />
          </div>
          {result.error ? (
            <p className="text-red-400 text-xs">{result.error}</p>
          ) : (
            <JsonViewer data={result.data} defaultExpanded />
          )}
        </div>
      )}

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg">
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-xs font-medium text-neutral-400">Export History ({exports.length})</h3>
          <button onClick={loadExports} className="text-[11px] text-neutral-500 hover:text-neutral-300">Refresh</button>
        </div>

        {loading ? (
          <div className="p-4 text-neutral-500 text-xs">Loading...</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] text-neutral-500 border-b border-neutral-800/50">
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Export ID</th>
                <th className="text-left px-4 py-2 font-medium">Hash</th>
                <th className="text-left px-4 py-2 font-medium">By</th>
                <th className="text-left px-4 py-2 font-medium">Created</th>
                <th className="text-left px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {exports.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-600">No exports yet</td></tr>
              ) : (
                exports.map((ex: any) => (
                  <tr key={ex.export_id} className="border-b border-neutral-800/30 hover:bg-white/[0.02]">
                    <td className="px-4 py-2"><StatusBadge variant="info" label={ex.export_type} /></td>
                    <td className="px-4 py-2 text-neutral-500 font-mono">{ex.export_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-2 text-neutral-600 font-mono">{ex.report_hash?.slice(0, 12)}...</td>
                    <td className="px-4 py-2 text-neutral-400">{ex.requested_by}</td>
                    <td className="px-4 py-2 text-neutral-500">{new Date(ex.created_at).toLocaleString('ko-KR')}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => handleViewDetail(ex.export_id)} className="text-[11px] text-neutral-400 hover:text-white">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-neutral-400">Detail - {(selected as any).export_id?.slice(0, 8)}...</h3>
            <button onClick={() => setSelected(null)} className="text-[11px] text-neutral-500 hover:text-neutral-300">Close</button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3 text-[11px]">
            <div><span className="text-neutral-500">Type: </span><span className="text-neutral-300">{(selected as any).export_type}</span></div>
            <div><span className="text-neutral-500">Hash: </span><span className="text-neutral-300 font-mono">{(selected as any).report_hash?.slice(0, 24)}...</span></div>
            <div><span className="text-neutral-500">Created: </span><span className="text-neutral-300">{new Date((selected as any).created_at).toLocaleString('ko-KR')}</span></div>
          </div>
          <JsonViewer data={(selected as any).report} title="Report Content" defaultExpanded />
        </div>
      )}
    </div>
  );
}
