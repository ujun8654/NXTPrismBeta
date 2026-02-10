import { useEffect, useRef, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import JsonViewer from '../components/JsonViewer';
import ReportViewer from '../components/ReportViewer';
import { useI18n } from '../i18n';
import {
  generateAuditReport, generateChainAudit, generateComplianceSnapshot, generateOverrideHistory,
  getExportList, getExportDetail,
} from '../api';

const REPORT_ACTIONS = [
  { key: 'AUDIT_REPORT', fn: generateAuditReport },
  { key: 'CHAIN_AUDIT', fn: generateChainAudit },
  { key: 'COMPLIANCE', fn: generateComplianceSnapshot },
  { key: 'OVERRIDE', fn: generateOverrideHistory },
];

export default function AuditReports() {
  const { t } = useI18n();
  const [exports, setExports] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

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
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (e: any) { setResult({ type: key, error: e.message }); }
    setGenerating(null);
  }

  async function handleViewDetail(exportId: string) {
    try {
      setSelected(await getExportDetail(exportId));
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch {}
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-lg font-semibold text-white">{t('report.title')}</h2>
        <p className="text-xs text-neutral-500 mt-0.5">{t('report.desc')}</p>
      </div>

      {/* Report Generation Buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {REPORT_ACTIONS.map((action) => (
          <button
            key={action.key}
            onClick={() => handleGenerate(action.key, action.fn)}
            disabled={generating !== null}
            className="bg-neutral-900/50 border border-neutral-800 hover:border-neutral-600 rounded-lg p-4 text-left transition-colors disabled:opacity-50"
          >
            <div className="text-xs font-medium text-neutral-200">{t(`report.${action.key}`)}</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">{t(`report.${action.key}.desc`)}</div>
            {generating === action.key && <div className="text-[11px] text-neutral-400 mt-2">{t('common.generating')}</div>}
          </button>
        ))}
      </div>

      {/* Result */}
      {result && (
        <div ref={resultRef} className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-medium text-neutral-400">{t('report.result')}</h3>
            <StatusBadge variant={result.error ? 'error' : 'ok'} label={result.error ? t('common.failed') : t('common.success')} />
          </div>
          {result.error ? (
            <p className="text-red-400 text-xs">{result.error}</p>
          ) : (
            <div className="space-y-3">
              <ReportViewer type={result.type} data={result.data} />
              <JsonViewer data={result.data} title={t('common.showJson')} />
            </div>
          )}
        </div>
      )}

      {/* Export History */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg">
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-xs font-medium text-neutral-400">{t('report.exportHistory')} ({exports.length})</h3>
          <button onClick={loadExports} className="text-[11px] text-neutral-500 hover:text-neutral-300">{t('common.refresh')}</button>
        </div>

        {loading ? (
          <div className="p-4 text-neutral-500 text-xs">{t('common.loading')}</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] text-neutral-500 border-b border-neutral-800/50">
                <th className="text-left px-4 py-2 font-medium">{t('common.type')}</th>
                <th className="text-left px-4 py-2 font-medium">{t('report.exportId')}</th>
                <th className="text-left px-4 py-2 font-medium">{t('report.hash')}</th>
                <th className="text-left px-4 py-2 font-medium">{t('common.by')}</th>
                <th className="text-left px-4 py-2 font-medium">{t('common.createdAt')}</th>
                <th className="text-left px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {exports.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-600">{t('report.noExports')}</td></tr>
              ) : (
                exports.map((ex: any) => (
                  <tr key={ex.export_id} className="border-b border-neutral-800/30 hover:bg-white/[0.02]">
                    <td className="px-4 py-2"><StatusBadge variant="info" label={t(`report.${ex.export_type}`) !== `report.${ex.export_type}` ? t(`report.${ex.export_type}`) : ex.export_type} /></td>
                    <td className="px-4 py-2 text-neutral-500 font-mono">{ex.export_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-2 text-neutral-600 font-mono">{ex.report_hash?.slice(0, 12)}...</td>
                    <td className="px-4 py-2 text-neutral-400">{ex.requested_by}</td>
                    <td className="px-4 py-2 text-neutral-500">{new Date(ex.created_at).toLocaleString('ko-KR')}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => handleViewDetail(ex.export_id)} className="text-[11px] text-neutral-400 hover:text-white">{t('common.view')}</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div ref={detailRef} className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium text-neutral-400">{t('report.detailTitle')}</h3>
            <button onClick={() => setSelected(null)} className="text-[11px] text-neutral-500 hover:text-neutral-300">{t('common.close')}</button>
          </div>

          {/* Meta info */}
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-[11px] mb-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <span className="text-neutral-500 block">{t('report.reportType')}</span>
                <span className="text-neutral-200">{t(`report.${(selected as any).export_type}`) !== `report.${(selected as any).export_type}` ? t(`report.${(selected as any).export_type}`) : (selected as any).export_type}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">{t('report.hash')}</span>
                <span className="text-neutral-200 font-mono">{(selected as any).report_hash?.slice(0, 24)}...</span>
              </div>
              <div>
                <span className="text-neutral-500 block">{t('common.createdAt')}</span>
                <span className="text-neutral-200">{new Date((selected as any).created_at).toLocaleString('ko-KR')}</span>
              </div>
            </div>
          </div>

          {/* Report content rendered as human-readable */}
          <ReportViewer type={(selected as any).export_type} data={(selected as any).report} />

          <div className="mt-3">
            <JsonViewer data={selected} title={t('common.showJson')} />
          </div>
        </div>
      )}
    </div>
  );
}
