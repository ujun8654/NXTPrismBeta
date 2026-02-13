import { useEffect, useRef, useState } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { motion } from 'framer-motion';
import StatusBadge from '../components/StatusBadge';
import JsonViewer from '../components/JsonViewer';
import ReportViewer from '../components/ReportViewer';
import { useI18n } from '../i18n';
import {
  generateAuditReport, generateChainAudit, generateComplianceSnapshot, generateOverrideHistory,
  getExportList, getExportDetail, getOverrideKpis, verifyChain,
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
  const [kpis, setKpis] = useState<any>(null);
  const [chainStatus, setChainStatus] = useState<any>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [ex, k, cv] = await Promise.all([
        getExportList().catch(() => []),
        getOverrideKpis().catch(() => null),
        verifyChain().catch(() => null),
      ]);
      setExports((ex as any[]) || []);
      setKpis(k);
      setChainStatus(cv);
    } catch {}
    setLoading(false);
  }

  async function handleGenerate(key: string, fn: () => Promise<unknown>) {
    setGenerating(key); setResult(null);
    try {
      const r = await fn();
      setResult({ type: key, data: r });
      await loadAll();
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (e: any) { setResult({ type: key, error: e.message }); }
    setGenerating(null);
  }

  async function handleToggleDetail(exportId: string) {
    if (expandedId === exportId) { setExpandedId(null); setExpandedData(null); return; }
    setExpandedId(exportId); setExpandedData(null);
    try { setExpandedData(await getExportDetail(exportId)); } catch {}
  }

  function tType(exportType: string) { const k = `report.${exportType}`; const v = t(k); return v !== k ? v : exportType; }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-white/5">
        <h2 className="font-display text-sm font-semibold tracking-wider text-atc-white uppercase">
          {t('report.title')}
        </h2>
        <p className="text-[11px] text-neutral-500 mt-0.5">{t('report.desc')}</p>
      </div>

      <div className="flex-1 overflow-hidden">
        <Group orientation="horizontal" className="h-full">
          {/* ─── Left: Reports ─── */}
          <Panel defaultSize={60} minSize={40}>
            <div className="h-full overflow-auto p-4 space-y-4">
              {/* Report Generation Buttons */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {REPORT_ACTIONS.map((action) => (
                  <motion.button
                    key={action.key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleGenerate(action.key, action.fn)}
                    disabled={generating !== null}
                    className="glass-card glass-panel-hover rounded-lg p-4 text-left transition-all disabled:opacity-50"
                  >
                    <div className="text-xs font-medium text-neutral-200">{t(`report.${action.key}`)}</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">{t(`report.${action.key}.desc`)}</div>
                    {generating === action.key && <div className="text-[10px] text-atc-aqua mt-2">{t('common.generating')}</div>}
                  </motion.button>
                ))}
              </div>

              {/* Result */}
              {result && (
                <motion.div ref={resultRef} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">{t('report.result')}</h3>
                    <StatusBadge variant={result.error ? 'error' : 'ok'} label={result.error ? t('common.failed') : t('common.success')} glow />
                  </div>
                  {result.error ? (
                    <p className="text-atc-red text-xs">{result.error}</p>
                  ) : (
                    <div className="space-y-3">
                      <ReportViewer type={result.type} data={result.data} />
                      <JsonViewer data={result.data} title={t('common.showJson')} />
                    </div>
                  )}
                </motion.div>
              )}

              {/* Export History */}
              <div className="glass-card rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">{t('report.exportHistory')} ({exports.length})</h3>
                  <button onClick={loadAll} className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors">{t('common.refresh')}</button>
                </div>
                {loading ? (
                  <div className="p-4 text-neutral-500 text-xs">{t('common.loading')}</div>
                ) : exports.length === 0 ? (
                  <div className="px-4 py-8 text-center text-neutral-600 text-xs">{t('report.noExports')}</div>
                ) : (
                  <div className="divide-y divide-white/[0.03]">
                    {exports.map((ex: any) => {
                      const isOpen = expandedId === ex.export_id;
                      return (
                        <div key={ex.export_id}>
                          <button
                            onClick={() => handleToggleDetail(ex.export_id)}
                            className={`w-full grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_1rem] items-center gap-2 px-4 py-2.5 text-xs text-left transition-colors hover:bg-white/[0.02] ${isOpen ? 'bg-white/[0.03]' : ''}`}
                          >
                            <span className="overflow-hidden"><StatusBadge variant="info" label={tType(ex.export_type)} /></span>
                            <span className="text-neutral-500 font-mono truncate text-[10px]">{ex.export_id?.slice(0, 8)}...</span>
                            <span className="text-neutral-600 font-mono truncate text-[10px]">{ex.report_hash?.slice(0, 12)}...</span>
                            <span className="text-neutral-400 truncate">{ex.requested_by}</span>
                            <span className="text-neutral-500 text-right truncate">{new Date(ex.created_at).toLocaleString('ko-KR')}</span>
                            <span className="text-neutral-600 text-[10px] text-right">{isOpen ? '▾' : '▸'}</span>
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4 pt-1 bg-black/20 border-t border-white/[0.03]">
                              {!expandedData ? (
                                <p className="text-neutral-500 text-xs py-2">{t('common.loading')}</p>
                              ) : (
                                <div className="space-y-3">
                                  <div className="p-3 glass-card rounded-lg text-[11px]">
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
          </Panel>

          <Separator />

          {/* ─── Right: Audit Readiness KPIs ─── */}
          <Panel defaultSize={40} minSize={20}>
            <div className="h-full flex flex-col border-l border-white/5">
              <div className="px-4 py-3 border-b border-white/5">
                <h3 className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Audit Readiness
                </h3>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {/* Chain Integrity */}
                <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="glass-card rounded-lg p-4">
                  <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-2">Chain Integrity</h4>
                  {chainStatus ? (
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={(chainStatus as any).valid ? 'ok' : 'error'} label={(chainStatus as any).valid ? 'VALID' : 'INVALID'} glow />
                      <span className="text-[10px] text-neutral-500">{(chainStatus as any).records_checked} records</span>
                    </div>
                  ) : <span className="text-neutral-600 text-[11px]">—</span>}
                </motion.div>

                {/* Override KPIs */}
                <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 }} className="glass-card rounded-lg p-4">
                  <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-2">Override KPIs</h4>
                  {kpis ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <KpiItem label="Total" value={kpis.total_count} />
                        <KpiItem label="Avg Approval" value={kpis.avg_approval_minutes != null ? `${kpis.avg_approval_minutes.toFixed(1)}m` : 'N/A'} />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(kpis.by_status || {}).map(([k, v]) => (
                          <span key={k} className="px-2 py-0.5 glass-card rounded text-[10px]">
                            <span className="text-neutral-400">{k}</span>
                            <span className="text-atc-white ml-1">{v as number}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : <span className="text-neutral-600 text-[11px]">—</span>}
                </motion.div>

                {/* Export Stats */}
                <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }} className="glass-card rounded-lg p-4">
                  <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-2">Export Stats</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <KpiItem label="Total Exports" value={exports.length} />
                    <KpiItem label="Report Types" value={new Set(exports.map((e: any) => e.export_type)).size} />
                  </div>
                </motion.div>

                {/* Readiness Score */}
                <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }} className="glass-card rounded-lg p-4 glow-border-aqua">
                  <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-2">Readiness Score</h4>
                  <div className="font-display text-3xl font-bold text-atc-aqua">
                    {calculateReadiness(chainStatus, kpis, exports)}%
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">Based on chain integrity, override governance, and export coverage</p>
                </motion.div>
              </div>
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}

function KpiItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-display text-lg font-bold text-atc-white">{value}</div>
      <div className="text-[10px] text-neutral-500">{label}</div>
    </div>
  );
}

function calculateReadiness(chain: any, kpis: any, exports: any[]): number {
  let score = 0;
  let total = 0;
  // Chain integrity
  total += 40;
  if (chain && (chain as any).valid) score += 40;
  // Override governance
  total += 30;
  if (kpis && kpis.total_count > 0) {
    const executed = kpis.by_status?.EXECUTED || 0;
    const rejected = kpis.by_status?.REJECTED || 0;
    const resolved = executed + rejected;
    score += Math.round((resolved / kpis.total_count) * 30);
  } else {
    score += 30; // no overrides needed = full score
  }
  // Export coverage
  total += 30;
  if (exports.length > 0) score += Math.min(30, exports.length * 5);
  return total > 0 ? Math.round((score / total) * 100) : 0;
}
