import { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import JsonViewer from '../components/JsonViewer';
import { getAssetState, getAssetHistory } from '../api';

const STATE_COLORS: Record<string, 'ok' | 'warn' | 'error' | 'info' | 'neutral'> = {
  SERVICEABLE: 'ok',
  MONITORING: 'warn',
  GROUNDED: 'error',
  MAINTENANCE: 'info',
  DECOMMISSIONED: 'neutral',
};

export default function StateMachine() {
  const [machineId, setMachineId] = useState('');
  const [assetType, setAssetType] = useState('drone');
  const [assetId, setAssetId] = useState('');
  const [currentState, setCurrentState] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleQuery() {
    if (!machineId.trim() || !assetId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const [state, hist] = await Promise.all([
        getAssetState(machineId, assetType, assetId).catch(() => null),
        getAssetHistory(machineId, assetType, assetId).catch(() => []),
      ]);
      setCurrentState(state);
      setHistory((hist as any[]) || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">State Machine</h2>
        <p className="text-sm text-gray-500 mt-1">자산 상태 조회 + 전이 이력</p>
      </div>

      {/* 조회 폼 */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Asset Query</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Machine ID</label>
            <input
              type="text"
              placeholder="UUID..."
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-400/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Asset Type</label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-green-400/50"
            >
              <option value="drone">drone</option>
              <option value="vehicle">vehicle</option>
              <option value="sensor">sensor</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Asset ID</label>
            <input
              type="text"
              placeholder="e.g. DRONE-001"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-400/50"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleQuery}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-400/10 hover:bg-green-400/20 text-green-400 border border-green-400/30 rounded text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : '▶ Query'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-400/10 border border-red-400/30 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Current State */}
      {currentState && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Current State</h3>
          <div className="flex items-center gap-4">
            <StatusBadge
              variant={STATE_COLORS[currentState.current_state] || 'neutral'}
              label={currentState.current_state}
            />
            <span className="text-xs text-gray-500">
              Updated: {new Date(currentState.updated_at).toLocaleString('ko-KR')}
            </span>
          </div>
        </div>
      )}

      {/* State Flow 시각화 */}
      {currentState && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">State Flow</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {['SERVICEABLE', 'MONITORING', 'GROUNDED', 'MAINTENANCE', 'DECOMMISSIONED'].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`px-3 py-1.5 rounded border text-xs font-medium ${
                    currentState.current_state === s
                      ? 'bg-green-400/20 border-green-400 text-green-400'
                      : 'bg-gray-800/50 border-gray-700 text-gray-500'
                  }`}
                >
                  {s}
                </div>
                {s !== 'DECOMMISSIONED' && <span className="text-gray-600">→</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transition History */}
      {history.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-800">
            <h3 className="text-sm font-medium text-gray-300">Transition History ({history.length} records)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="text-left px-4 py-2">From</th>
                  <th className="text-left px-4 py-2">To</th>
                  <th className="text-left px-4 py-2">Result</th>
                  <th className="text-left px-4 py-2">Gate</th>
                  <th className="text-left px-4 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h: any, i: number) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-2 text-gray-400">{h.from_state}</td>
                    <td className="px-4 py-2 text-gray-200">{h.to_state}</td>
                    <td className="px-4 py-2">
                      <StatusBadge
                        variant={h.result === 'COMMITTED' ? 'ok' : h.result === 'DENIED' ? 'error' : 'warn'}
                        label={h.result}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge
                        variant={h.gate_mode === 'HARD' ? 'error' : h.gate_mode === 'SOFT' ? 'warn' : 'neutral'}
                        label={h.gate_mode}
                      />
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {new Date(h.committed_at || h.created_at).toLocaleString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3">
            <JsonViewer data={history} title="Raw JSON" />
          </div>
        </div>
      )}
    </div>
  );
}
