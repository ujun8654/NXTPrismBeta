import { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { getHealth, getChainHead, verifyChain, getOverrideKpis, getExportList, TENANT_ID } from '../api';

export default function Overview() {
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null);
  const [chainHead, setChainHead] = useState<any>(null);
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [exports, setExports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

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
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">System Overview</h2>
          <p className="text-sm text-gray-500 mt-1">NXTPrism Trust Infrastructure — 실시간 시스템 현황</p>
        </div>
        <button
          onClick={loadAll}
          className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-400/10 border border-red-400/30 rounded text-red-400 text-sm">
          API 연결 실패: {error}. API 서버가 실행 중인지 확인하세요.
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : (
        <>
          {/* 상태 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Health */}
            <Card title="API Server">
              {health ? (
                <>
                  <StatusBadge variant="ok" label="ONLINE" pulse />
                  <p className="text-xs text-gray-500 mt-2">{health.timestamp}</p>
                </>
              ) : (
                <StatusBadge variant="error" label="OFFLINE" />
              )}
            </Card>

            {/* Chain Integrity */}
            <Card title="Chain Integrity">
              {chainValid !== null ? (
                <>
                  <StatusBadge
                    variant={chainValid ? 'ok' : 'error'}
                    label={chainValid ? 'VALID' : 'TAMPERED'}
                  />
                  {chainHead && (
                    <p className="text-xs text-gray-500 mt-2">
                      Head: seq #{chainHead.sequence_num}
                    </p>
                  )}
                </>
              ) : (
                <span className="text-gray-500 text-sm">No data</span>
              )}
            </Card>

            {/* Override KPIs */}
            <Card title="Override Summary">
              {kpis ? (
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-white">{kpis.total_count}</div>
                  <div className="text-xs text-gray-500">
                    {Object.entries(kpis.by_status || {}).map(([k, v]) => (
                      <span key={k} className="mr-3">
                        {k}: <span className="text-gray-300">{v as number}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <span className="text-gray-500 text-sm">No data</span>
              )}
            </Card>

            {/* Exports */}
            <Card title="Audit Exports">
              <div className="text-2xl font-bold text-white">{exports.length}</div>
              <p className="text-xs text-gray-500 mt-1">total reports generated</p>
            </Card>
          </div>

          {/* 최근 감사 보고서 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-800">
              <h3 className="text-sm font-medium text-gray-300">Recent Exports</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-800">
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-left px-4 py-2">Export ID</th>
                    <th className="text-left px-4 py-2">Requested By</th>
                    <th className="text-left px-4 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {exports.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-600">
                        No exports yet
                      </td>
                    </tr>
                  ) : (
                    exports.slice(0, 10).map((ex: any) => (
                      <tr key={ex.export_id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-2">
                          <StatusBadge variant="info" label={ex.export_type} />
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-400 font-mono">
                          {ex.export_id?.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-2 text-gray-400">{ex.requested_by}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs">
                          {new Date(ex.created_at).toLocaleString('ko-KR')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}
