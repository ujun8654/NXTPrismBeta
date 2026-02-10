import { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import JsonViewer from '../components/JsonViewer';
import { getOverrides, getOverrideKpis, getOverrideDetail } from '../api';

const STATUS_VARIANT: Record<string, 'ok' | 'error' | 'warn' | 'info' | 'neutral'> = {
  EXECUTED: 'ok', REJECTED: 'error', PENDING_APPROVAL: 'warn', REQUESTED: 'info', EXPIRED: 'neutral',
};

export default function OverrideGovernance() {
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

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-lg font-semibold text-white">Overrides</h2>
        <p className="text-xs text-neutral-500 mt-0.5">Override requests and KPI monitoring</p>
      </div>

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Total" value={kpis.total_count} />
          <KpiCard label="Pending" value={(kpis.by_status?.PENDING_APPROVAL || 0) + (kpis.by_status?.REQUESTED || 0)} />
          <KpiCard label="Executed" value={kpis.by_status?.EXECUTED || 0} />
          <KpiCard label="Rejected" value={kpis.by_status?.REJECTED || 0} />
          <KpiCard label="Avg Approval" value={kpis.avg_approval_minutes != null ? `${kpis.avg_approval_minutes.toFixed(1)}m` : 'N/A'} />
        </div>
      )}

      {kpis?.by_reason_code && Object.keys(kpis.by_reason_code).length > 0 && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <h3 className="text-xs font-medium text-neutral-400 mb-3">By Reason Code</h3>
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

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg">
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-xs font-medium text-neutral-400">Override Requests</h3>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 bg-neutral-950 border border-neutral-700 rounded-md text-[11px] text-neutral-300 focus:outline-none"
          >
            <option value="">All</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="PENDING_APPROVAL">PENDING</option>
            <option value="EXECUTED">EXECUTED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        {loading ? (
          <div className="p-4 text-neutral-500 text-xs">Loading...</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] text-neutral-500 border-b border-neutral-800/50">
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Reason</th>
                <th className="text-left px-4 py-2 font-medium">Transition</th>
                <th className="text-left px-4 py-2 font-medium">By</th>
                <th className="text-left px-4 py-2 font-medium">Time</th>
                <th className="text-left px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {overrides.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-600">No overrides found</td></tr>
              ) : (
                overrides.map((o: any) => (
                  <tr key={o.override_id} className="border-b border-neutral-800/30 hover:bg-white/[0.02]">
                    <td className="px-4 py-2"><StatusBadge variant={STATUS_VARIANT[o.status] || 'neutral'} label={o.status} /></td>
                    <td className="px-4 py-2 text-neutral-300">{o.reason_code}</td>
                    <td className="px-4 py-2 text-neutral-400">{o.from_state} → {o.to_state}</td>
                    <td className="px-4 py-2 text-neutral-400">{o.requested_by}</td>
                    <td className="px-4 py-2 text-neutral-500">{new Date(o.requested_at).toLocaleString('ko-KR')}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => handleSelect(o.override_id)} className="text-[11px] text-neutral-400 hover:text-white">
                        Detail
                      </button>
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
            <h3 className="text-xs font-medium text-neutral-400">Override Detail - {(selected as any).override_id?.slice(0, 8)}...</h3>
            <button onClick={() => setSelected(null)} className="text-[11px] text-neutral-500 hover:text-neutral-300">Close</button>
          </div>
          <JsonViewer data={selected} defaultExpanded />
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
