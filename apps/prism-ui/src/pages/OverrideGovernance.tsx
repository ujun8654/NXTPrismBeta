import { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import JsonViewer from '../components/JsonViewer';
import { useI18n } from '../i18n';
import { getOverrides, getOverrideKpis, getOverrideDetail } from '../api';

const STATUS_VARIANT: Record<string, 'ok' | 'error' | 'warn' | 'info' | 'neutral'> = {
  EXECUTED: 'ok', REJECTED: 'error', PENDING_APPROVAL: 'warn', REQUESTED: 'info', EXPIRED: 'neutral',
};

export default function OverrideGovernance() {
  const { t } = useI18n();
  const [kpis, setKpis] = useState<any>(null);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [statusFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [k, list] = await Promise.all([
        getOverrideKpis().catch(() => null),
        getOverrides(undefined, statusFilter || undefined).catch(() => []),
      ]);
      setKpis(k); setOverrides((list as any[]) || []);
    } catch {}
    setLoading(false);
  }

  async function handleToggle(overrideId: string) {
    if (expandedId === overrideId) {
      setExpandedId(null);
      setExpandedData(null);
      return;
    }
    setExpandedId(overrideId);
    setExpandedData(null);
    try { setExpandedData(await getOverrideDetail(overrideId)); } catch {}
  }

  function tStatus(status: string) {
    const k = `status.${status}`;
    const v = t(k);
    return v !== k ? v : status;
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-lg font-semibold text-white">{t('override.title')}</h2>
        <p className="text-xs text-neutral-500 mt-0.5">{t('override.desc')}</p>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label={t('override.total')} value={kpis.total_count} />
          <KpiCard label={t('override.pending')} value={(kpis.by_status?.PENDING_APPROVAL || 0) + (kpis.by_status?.REQUESTED || 0)} />
          <KpiCard label={t('override.executed')} value={kpis.by_status?.EXECUTED || 0} />
          <KpiCard label={t('override.rejected')} value={kpis.by_status?.REJECTED || 0} />
          <KpiCard label={t('override.avgApproval')} value={kpis.avg_approval_minutes != null ? `${kpis.avg_approval_minutes.toFixed(1)}m` : 'N/A'} />
        </div>
      )}

      {/* By Reason Code */}
      {kpis?.by_reason_code && Object.keys(kpis.by_reason_code).length > 0 && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <h3 className="text-xs font-medium text-neutral-400 mb-3">{t('override.byReason')}</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(kpis.by_reason_code).map(([code, count]) => (
              <div key={code} className="px-2.5 py-1 bg-neutral-800 rounded-md text-[11px]">
                <span className="text-neutral-400">{code}</span>
                <span className="text-white ml-1.5">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Override List */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg">
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-xs font-medium text-neutral-400">{t('override.requests')}</h3>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 bg-neutral-950 border border-neutral-700 rounded-md text-[11px] text-neutral-300 focus:outline-none"
          >
            <option value="">{t('override.filter.all')}</option>
            <option value="REQUESTED">{t('override.filter.requested')}</option>
            <option value="PENDING_APPROVAL">{t('override.filter.pending')}</option>
            <option value="EXECUTED">{t('override.filter.executed')}</option>
            <option value="REJECTED">{t('override.filter.rejected')}</option>
          </select>
        </div>

        {loading ? (
          <div className="p-4 text-neutral-500 text-xs">{t('common.loading')}</div>
        ) : overrides.length === 0 ? (
          <div className="px-4 py-8 text-center text-neutral-600 text-xs">{t('override.noOverrides')}</div>
        ) : (
          <div className="divide-y divide-neutral-800/30">
            {overrides.map((o: any) => {
              const isOpen = expandedId === o.override_id;
              return (
                <div key={o.override_id}>
                  {/* Row */}
                  <button
                    onClick={() => handleToggle(o.override_id)}
                    className={`w-full grid grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_1rem] items-center gap-2 px-4 py-2.5 text-xs text-left transition-colors hover:bg-white/[0.02] ${isOpen ? 'bg-white/[0.03]' : ''}`}
                  >
                    <span className="overflow-hidden"><StatusBadge variant={STATUS_VARIANT[o.status] || 'neutral'} label={tStatus(o.status)} /></span>
                    <span className="text-neutral-300 truncate">{o.reason_code}</span>
                    <span className="text-neutral-400 truncate">{o.from_state} → {o.to_state}</span>
                    <span className="text-neutral-400 truncate">{o.requested_by}</span>
                    <span className="text-neutral-500 text-right truncate">{new Date(o.requested_at).toLocaleString('ko-KR')}</span>
                    <span className="text-neutral-600 text-[10px] text-right">{isOpen ? '▾' : '▸'}</span>
                  </button>

                  {/* Inline Detail */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 bg-neutral-950/50 border-t border-neutral-800/50">
                      {!expandedData ? (
                        <p className="text-neutral-500 text-xs py-2">{t('common.loading')}</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[11px]">
                              <div>
                                <span className="text-neutral-500 block">{t('common.status')}</span>
                                <StatusBadge variant={STATUS_VARIANT[expandedData.status] || 'neutral'} label={tStatus(expandedData.status)} />
                              </div>
                              <div>
                                <span className="text-neutral-500 block">{t('override.reason')}</span>
                                <span className="text-neutral-200">{expandedData.reason_code}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block">{t('override.transition')}</span>
                                <span className="text-neutral-200">{expandedData.from_state} → {expandedData.to_state}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block">{t('override.requestedBy')}</span>
                                <span className="text-neutral-200">{expandedData.requested_by}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block">{t('override.requestedAt')}</span>
                                <span className="text-neutral-200">{new Date(expandedData.requested_at).toLocaleString('ko-KR')}</span>
                              </div>
                            </div>

                            {/* Approvals */}
                            {expandedData.approvals && expandedData.approvals.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-neutral-800">
                                <span className="text-neutral-500 text-[11px] block mb-1.5">{t('override.approvals')}</span>
                                <div className="space-y-1">
                                  {expandedData.approvals.map((a: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-[11px]">
                                      <StatusBadge variant={a.decision === 'APPROVE' ? 'ok' : 'error'} label={a.decision} />
                                      <span className="text-neutral-300">{a.approver}</span>
                                      <span className="text-neutral-600">{a.approved_at ? new Date(a.approved_at).toLocaleString('ko-KR') : ''}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
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

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3 text-center">
      <div className="text-xl font-semibold text-white">{value}</div>
      <div className="text-[11px] text-neutral-500 mt-0.5">{label}</div>
    </div>
  );
}
