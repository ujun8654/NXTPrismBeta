import { useEffect, useState } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { motion } from 'framer-motion';
import StatusBadge from '../components/StatusBadge';
import { useI18n } from '../i18n';
import { getHealth, getChainHead, verifyChain, getOverrideKpis, getExportList } from '../api';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function Overview() {
  const { t } = useI18n();
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null);
  const [chainHead, setChainHead] = useState<any>(null);
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [exports, setExports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [h, ch, cv, k, ex] = await Promise.all([
        getHealth().catch(() => null),
        getChainHead().catch(() => null),
        verifyChain().catch(() => null),
        getOverrideKpis().catch(() => null),
        getExportList().catch(() => []),
      ]);
      setHealth(h);
      setChainHead(ch);
      setChainValid((cv as any)?.valid ?? null);
      setKpis(k);
      setExports((ex as any[]) || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Title Row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div>
          <h2 className="font-display text-sm font-semibold tracking-wider text-atc-white uppercase">
            {t('overview.title')}
          </h2>
          <p className="text-[11px] text-neutral-500 mt-0.5">{t('overview.desc')}</p>
        </div>
        <button
          onClick={loadAll}
          className="px-3 py-1.5 text-[11px] font-medium text-neutral-400 glass-panel rounded-md hover:text-atc-white hover:bg-white/5 transition-colors"
        >
          {t('common.refresh')}
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-3 p-3 glass-card rounded-lg glow-border-red text-atc-red text-xs">
          {t('overview.apiConnFailed')}: {error}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
          {t('common.loading')}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <Group orientation="horizontal" className="h-full">
            {/* ─── Left: KPI Cards + Exports ─── */}
            <Panel defaultSize={65} minSize={40}>
              <div className="h-full overflow-auto p-4">
                <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <motion.div variants={fadeUp}>
                      <GlassCard title={t('overview.apiServer')}>
                        {health ? (
                          <>
                            <StatusBadge variant="ok" label={t('overview.online')} pulse glow />
                            <p className="text-[10px] text-neutral-600 mt-2 font-mono">{health.timestamp}</p>
                          </>
                        ) : (
                          <StatusBadge variant="error" label={t('overview.offline')} glow />
                        )}
                      </GlassCard>
                    </motion.div>

                    <motion.div variants={fadeUp}>
                      <GlassCard title={t('overview.chainIntegrity')}>
                        {chainValid !== null ? (
                          <>
                            <StatusBadge
                              variant={chainValid ? 'ok' : 'error'}
                              label={chainValid ? t('overview.valid') : t('overview.tampered')}
                              glow
                            />
                            {chainHead && (
                              <p className="text-[10px] text-neutral-600 mt-2">
                                {t('overview.headSeq')} #{chainHead.sequence_num}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-neutral-600 text-xs">{t('common.noData')}</span>
                        )}
                      </GlassCard>
                    </motion.div>

                    <motion.div variants={fadeUp}>
                      <GlassCard title={t('overview.overrideSummary')}>
                        {kpis ? (
                          <>
                            <div className="font-display text-2xl font-bold text-atc-white">
                              {kpis.total_count}
                            </div>
                            <div className="text-[10px] text-neutral-500 mt-1 flex flex-wrap gap-x-2">
                              {Object.entries(kpis.by_status || {}).map(([k, v]) => (
                                <span key={k}>
                                  {t(`status.${k}`) !== `status.${k}` ? t(`status.${k}`) : k}:{' '}
                                  <span className="text-neutral-300">{v as number}</span>
                                </span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <span className="text-neutral-600 text-xs">{t('common.noData')}</span>
                        )}
                      </GlassCard>
                    </motion.div>

                    <motion.div variants={fadeUp}>
                      <GlassCard title={t('overview.auditExports')}>
                        <div className="font-display text-2xl font-bold text-atc-white">
                          {exports.length}
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-1">{t('overview.totalReports')}</p>
                      </GlassCard>
                    </motion.div>
                  </div>

                  {/* Recent Exports Table */}
                  <motion.div variants={fadeUp} className="glass-card rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5">
                      <h3 className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                        {t('overview.recentExports')}
                      </h3>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] text-neutral-500 border-b border-white/5">
                          <th className="text-left px-4 py-2 font-medium">{t('common.type')}</th>
                          <th className="text-left px-4 py-2 font-medium">{t('report.exportId')}</th>
                          <th className="text-left px-4 py-2 font-medium">{t('common.by')}</th>
                          <th className="text-left px-4 py-2 font-medium">{t('common.createdAt')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exports.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-neutral-600">
                              {t('overview.noExports')}
                            </td>
                          </tr>
                        ) : (
                          exports.slice(0, 10).map((ex: any) => (
                            <tr key={ex.export_id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-2">
                                <StatusBadge
                                  variant="info"
                                  label={t(`report.${ex.export_type}`) !== `report.${ex.export_type}` ? t(`report.${ex.export_type}`) : ex.export_type}
                                />
                              </td>
                              <td className="px-4 py-2 text-neutral-500 font-mono text-[10px]">
                                {ex.export_id?.slice(0, 8)}...
                              </td>
                              <td className="px-4 py-2 text-neutral-400">{ex.requested_by}</td>
                              <td className="px-4 py-2 text-neutral-500">
                                {new Date(ex.created_at).toLocaleString('ko-KR')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </motion.div>
                </motion.div>
              </div>
            </Panel>

            <Separator />

            {/* ─── Right: Alert Queue ─── */}
            <Panel defaultSize={35} minSize={20}>
              <div className="h-full flex flex-col border-l border-white/5">
                <div className="px-4 py-3 border-b border-white/5">
                  <h3 className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                    Alert Queue
                  </h3>
                </div>
                <div className="flex-1 overflow-auto p-3 space-y-2">
                  {chainValid === false && (
                    <motion.div
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass-card rounded-lg p-3 glow-border-red"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge variant="error" label="DANGER" glow />
                        <span className="text-[10px] text-neutral-500 font-mono">CHAIN</span>
                      </div>
                      <p className="text-[11px] text-neutral-300">{t('overview.tampered')}</p>
                      <p className="text-[10px] text-neutral-600 mt-1">
                        {chainHead && `seq #${chainHead.sequence_num}`}
                      </p>
                    </motion.div>
                  )}

                  {kpis && (kpis.by_status?.PENDING_APPROVAL || 0) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="glass-card rounded-lg p-3 glow-border-orange"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge variant="warn" label="WARNING" glow />
                        <span className="text-[10px] text-neutral-500 font-mono">OVERRIDE</span>
                      </div>
                      <p className="text-[11px] text-neutral-300">
                        {kpis.by_status.PENDING_APPROVAL} pending approval
                      </p>
                    </motion.div>
                  )}

                  {health && (
                    <motion.div
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className="glass-card rounded-lg p-3 glow-border-green"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge variant="ok" label="OK" glow />
                        <span className="text-[10px] text-neutral-500 font-mono">SYSTEM</span>
                      </div>
                      <p className="text-[11px] text-neutral-300">API server operational</p>
                    </motion.div>
                  )}

                  {chainValid === true && (
                    <motion.div
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="glass-card rounded-lg p-3 glow-border-green"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge variant="ok" label="VERIFIED" glow />
                        <span className="text-[10px] text-neutral-500 font-mono">INTEGRITY</span>
                      </div>
                      <p className="text-[11px] text-neutral-300">
                        Chain integrity valid
                        {chainHead && ` — ${chainHead.sequence_num} records`}
                      </p>
                    </motion.div>
                  )}

                  {!health && chainValid === null && (
                    <div className="flex-1 flex items-center justify-center py-12">
                      <p className="text-neutral-700 text-[11px]">No alerts</p>
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          </Group>
        </div>
      )}
    </div>
  );
}

function GlassCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-lg p-4 hover:bg-white/[0.03] transition-colors h-full">
      <h3 className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}
