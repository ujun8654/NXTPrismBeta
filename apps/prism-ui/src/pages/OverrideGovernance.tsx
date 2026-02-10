import { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import JsonViewer from '../components/JsonViewer';
import { getOverrides, getOverrideKpis, getOverrideDetail } from '../api';

const STATUS_VARIANT: Record<string, 'ok' | 'error' | 'warn' | 'info' | 'neutral'> = {
  EXECUTED: 'ok',
  REJECTED: 'error',
  PENDING_APPROVAL: 'warn',
  REQUESTED: 'info',
  EXPIRED: 'neutral',
};

export default function OverrideGovernance() {
  const [kpis, setKpis] = useState<any>(null);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [k, list] = await Promise.all([
        getOverrideKpis().catch(() => null),
        getOverrides(undefined, statusFilter || undefined).catch(() => []),
      ]);
      setKpis(k);
      setOverrides((list as any[]) || []);
    } catch {}
    setLoading(false);
  }

  async function handleSelect(overrideId: string) {
    try {
      const detail = await getOverrideDetail(overrideId);
      setSelected(detail);
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Override Governance</h2>
        <p className="text-sm text-gray-500 mt-1">Override 요청 관리 + KPI 모니터링</p>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Total" value={kpis.total_count} color="text-white" />
          <KpiCard
            label="Pending"
            value={(kpis.by_status?.PENDING_APPROVAL || 0) + (kpis.by_status?.REQUESTED || 0)}
            color="text-yellow-400"
          />
          <KpiCard label="Executed" value={kpis.by_status?.EXECUTED || 0} color="text-green-400" />
          <KpiCard label="Rejected" value={kpis.by_status?.REJECTED || 0} color="text-red-400" />
          <KpiCard
            label="Avg Approval"
            value={kpis.avg_approval_minutes != null ? `${kpis.avg_approval_minutes.toFixed(1)}m` : 'N/A'}
            color="text-blue-400"
          />
        </div>
      )}

      {/* By Reason Code */}
      {kpis?.by_reason_code && Object.keys(kpis.by_reason_code).length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">By Reason Code</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(kpis.by_reason_code).map(([code, count]) => (
              <div key={code} className="px-3 py-1.5 bg-gray-800 rounded text-xs">
                <span className="text-gray-400">{code}</span>
                <span className="text-white ml-2">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Override List */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">Override Requests</h3>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 bg-gray-950 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
            <option value="EXECUTED">EXECUTED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        {loading ? (
          <div className="p-4 text-gray-500 text-sm">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Reason</th>
                  <th className="text-left px-4 py-2">Transition</th>
                  <th className="text-left px-4 py-2">Requested By</th>
                  <th className="text-left px-4 py-2">Time</th>
                  <th className="text-left px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {overrides.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-600">
                      No overrides found
                    </td>
                  </tr>
                ) : (
                  overrides.map((o: any) => (
                    <tr key={o.override_id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2">
                        <StatusBadge variant={STATUS_VARIANT[o.status] || 'neutral'} label={o.status} />
                      </td>
                      <td className="px-4 py-2 text-gray-300 text-xs">{o.reason_code}</td>
                      <td className="px-4 py-2 text-xs text-gray-400">
                        {o.from_state} → {o.to_state}
                      </td>
                      <td className="px-4 py-2 text-gray-400">{o.requested_by}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {new Date(o.requested_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleSelect(o.override_id)}
                          className="text-xs text-green-400 hover:text-green-300"
                        >
                          Detail
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

      {/* Selected Detail */}
      {selected && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            Override Detail — {(selected as any).override_id?.slice(0, 8)}...
          </h3>
          <JsonViewer data={selected} defaultExpanded />
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
