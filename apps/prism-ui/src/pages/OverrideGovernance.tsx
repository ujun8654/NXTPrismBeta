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
  const [selected, setSelected] = useState<any>(null);
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

  async function handleSelect(overrideId: string) {
    try { setSelected(await getOverrideDetail(overrideId)); } catch {}
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
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] text-neutral-500 border-b border-neutral-800/50">
                <th className="text-left px-4 py-2 font-medium">{t('common.status')}</th>
                <th className="text-left px-4 py-2 font-medium">{t('override.reason')}</th>
                <th className="text-left px-4 py-2 font-medium">{t('override.transition')}</th>
                <th className="text-left px-4 py-2 font-medium">{t('common.by')}</th>
                <th className="text-left px-4 py-2 font-medium">{t('common.time')}</th>
                <th className="text-left px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {overrides.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-600">{t('override.noOverrides')}</td></tr>
              ) : (
                overrides.map((o: any) => (
                  <tr key={o.override_id} className="border-b border-neutral-800/30 hover:bg-white/[0.02]">
                    <td className="px-4 py-2"><StatusBadge variant={STATUS_VARIANT[o.status] || 'neutral'} label={tStatus(o.status)} /></td>
                    <td className="px-4 py-2 text-neutral-300">{o.reason_code}</td>
                    <td className="px-4 py-2 text-neutral-400">{o.from_state} → {o.to_state}</td>
                    <td className="px-4 py-2 text-neutral-400">{o.requested_by}</td>
                    <td className="px-4 py-2 text-neutral-500">{new Date(o.requested_at).toLocaleString('ko-KR')}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => handleSelect(o.override_id)} className="text-[11px] text-neutral-400 hover:text-white">
                        {t('common.detail')}
                      </button>
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
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium text-neutral-400">{t('override.detailTitle')}</h3>
            <button onClick={() => setSelected(null)} className="text-[11px] text-neutral-500 hover:text-neutral-300">{t('common.close')}</button>
          </div>

          {/* Human-readable summary */}
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3 mb-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[11px]">
              <div>
                <span className="text-neutral-500 block">{t('common.status')}</span>
                <StatusBadge variant={STATUS_VARIANT[selected.status] || 'neutral'} label={tStatus(selected.status)} />
              </div>
              <div>
                <span className="text-neutral-500 block">{t('override.reason')}</span>
                <span className="text-neutral-200">{selected.reason_code}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">{t('override.transition')}</span>
                <span className="text-neutral-200">{selected.from_state} → {selected.to_state}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">{t('override.requestedBy')}</span>
                <span className="text-neutral-200">{selected.requested_by}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">{t('override.requestedAt')}</span>
                <span className="text-neutral-200">{new Date(selected.requested_at).toLocaleString('ko-KR')}</span>
              </div>
            </div>

            {/* Approvals */}
            {selected.approvals && selected.approvals.length > 0 && (
              <div>
                <span className="text-neutral-500 text-[11px] block mb-1.5">{t('override.approvals')}</span>
                <div className="space-y-1">
                  {selected.approvals.map((a: any, i: number) => (
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

          <JsonViewer data={selected} title={t('common.showJson')} />
        </div>
      )}
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
