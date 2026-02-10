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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<any>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);

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

  async function handleToggleDetail(exportId: string) {
    if (expandedId === exportId) {
      setExpandedId(null);
      setExpandedData(null);
      return;
    }
    setExpandedId(exportId);
    setExpandedData(null);
    try { setExpandedData(await getExportDetail(exportId)); } catch {}
  }

  function tType(exportType: string) {
    const k = `report.${exportType}`;
    const v = t(k);
    return v !== k ? v : exportType;
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
        ) : exports.length === 0 ? (
          <div className="px-4 py-8 text-center text-neutral-600 text-xs">{t('report.noExports')}</div>
        ) : (
          <div className="divide-y divide-neutral-800/30">
            {exports.map((ex: any) => {
              const isOpen = expandedId === ex.export_id;
              return (
                <div key={ex.export_id}>
                  {/* Row */}
                  <button
                    onClick={() => handleToggleDetail(ex.export_id)}
                    className={`w-full grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_1rem] items-center gap-2 px-4 py-2.5 text-xs text-left transition-colors hover:bg-white/[0.02] ${isOpen ? 'bg-white/[0.03]' : ''}`}
                  >
                    <span className="overflow-hidden"><StatusBadge variant="info" label={tType(ex.export_type)} /></span>
                    <span className="text-neutral-500 font-mono truncate">{ex.export_id?.slice(0, 8)}...</span>
                    <span className="text-neutral-600 font-mono truncate">{ex.report_hash?.slice(0, 12)}...</span>
                    <span className="text-neutral-400 truncate">{ex.requested_by}</span>
                    <span className="text-neutral-500 text-right truncate">{new Date(ex.created_at).toLocaleString('ko-KR')}</span>
                    <span className="text-neutral-600 text-[10px] text-right">{isOpen ? '▾' : '▸'}</span>
                  </button>

                  {/* Inline Detail */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 bg-neutral-950/50 border-t border-neutral-800/50">
                      {!expandedData ? (
                        <p className="text-neutral-500 text-xs py-2">{t('common.loading')}</p>
                      ) : (
                        <div className="space-y-3">
                          {/* Meta */}
                          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-[11px]">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              <div>
                                <span className="text-neutral-500 block">{t('report.reportType')}</span>
                                <span className="text-neutral-200">{tType(expandedData.export_type)}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block">{t('report.hash')}</span>
                                <span className="text-neutral-200 font-mono">{expandedData.report_hash?.slice(0, 24)}...</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block">{t('common.createdAt')}</span>
                                <span className="text-neutral-200">{new Date(expandedData.created_at).toLocaleString('ko-KR')}</span>
                              </div>
                            </div>
                          </div>

                          {/* Report content */}
                          <ReportViewer type={expandedData.export_type} data={expandedData.report} />

                          <JsonViewer data={expandedData} title={t('common.showJson')} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
