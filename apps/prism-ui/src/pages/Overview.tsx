import { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { getHealth, getChainHead, verifyChain, getOverrideKpis, getExportList } from '../api';

export default function Overview() {
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
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Overview</h2>
          <p className="text-xs text-neutral-500 mt-0.5">System health and key metrics</p>
        </div>
        <button onClick={loadAll} className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-md transition-colors">
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-red-400 text-xs">
          API connection failed: {error}
        </div>
      )}

      {loading ? (
        <div className="text-neutral-500 text-sm">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card title="API Server">
              {health ? (
                <>
                  <StatusBadge variant="ok" label="ONLINE" pulse />
                  <p className="text-[11px] text-neutral-600 mt-2 font-mono">{health.timestamp}</p>
                </>
              ) : (
                <StatusBadge variant="error" label="OFFLINE" />
              )}
            </Card>

            <Card title="Chain Integrity">
              {chainValid !== null ? (
                <>
                  <StatusBadge variant={chainValid ? 'ok' : 'error'} label={chainValid ? 'VALID' : 'TAMPERED'} />
                  {chainHead && <p className="text-[11px] text-neutral-600 mt-2">Head: seq #{chainHead.sequence_num}</p>}
                </>
              ) : (
                <span className="text-neutral-600 text-xs">No data</span>
              )}
            </Card>

            <Card title="Override Summary">
              {kpis ? (
                <>
                  <div className="text-2xl font-semibold text-white">{kpis.total_count}</div>
                  <div className="text-[11px] text-neutral-500 mt-1 space-x-2">
                    {Object.entries(kpis.by_status || {}).map(([k, v]) => (
                      <span key={k}>{k}: <span className="text-neutral-300">{v as number}</span></span>
                    ))}
                  </div>
                </>
              ) : (
                <span className="text-neutral-600 text-xs">No data</span>
              )}
            </Card>

            <Card title="Audit Exports">
              <div className="text-2xl font-semibold text-white">{exports.length}</div>
              <p className="text-[11px] text-neutral-500 mt-1">total reports</p>
            </Card>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg">
            <div className="px-4 py-3 border-b border-neutral-800">
              <h3 className="text-xs font-medium text-neutral-400">Recent Exports</h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[11px] text-neutral-500 border-b border-neutral-800/50">
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-left px-4 py-2 font-medium">Export ID</th>
                  <th className="text-left px-4 py-2 font-medium">By</th>
                  <th className="text-left px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {exports.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-600">No exports yet</td></tr>
                ) : (
                  exports.slice(0, 10).map((ex: any) => (
                    <tr key={ex.export_id} className="border-b border-neutral-800/30 hover:bg-white/[0.02]">
                      <td className="px-4 py-2"><StatusBadge variant="info" label={ex.export_type} /></td>
                      <td className="px-4 py-2 text-neutral-500 font-mono">{ex.export_id?.slice(0, 8)}...</td>
                      <td className="px-4 py-2 text-neutral-400">{ex.requested_by}</td>
                      <td className="px-4 py-2 text-neutral-500">{new Date(ex.created_at).toLocaleString('ko-KR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
      <h3 className="text-[11px] text-neutral-500 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}
