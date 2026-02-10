import { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import JsonViewer from '../components/JsonViewer';
import { getAssetState, getAssetHistory } from '../api';

const STATE_COLORS: Record<string, 'ok' | 'warn' | 'error' | 'info' | 'neutral'> = {
  SERVICEABLE: 'ok', MONITORING: 'warn', GROUNDED: 'error', MAINTENANCE: 'info', DECOMMISSIONED: 'neutral',
};

const INPUT = "w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-500";

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
    setLoading(true); setError(null);
    try {
      const [state, hist] = await Promise.all([
        getAssetState(machineId, assetType, assetId).catch(() => null),
        getAssetHistory(machineId, assetType, assetId).catch(() => []),
      ]);
      setCurrentState(state);
      setHistory((hist as any[]) || []);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-lg font-semibold text-white">State Machine</h2>
        <p className="text-xs text-neutral-500 mt-0.5">Asset state query and transition history</p>
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
        <h3 className="text-xs font-medium text-neutral-400 mb-3">Asset Query</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] text-neutral-500 block mb-1">Machine ID</label>
            <input type="text" placeholder="UUID..." value={machineId} onChange={(e) => setMachineId(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="text-[11px] text-neutral-500 block mb-1">Asset Type</label>
            <select value={assetType} onChange={(e) => setAssetType(e.target.value)} className={INPUT}>
              <option value="drone">drone</option>
              <option value="vehicle">vehicle</option>
              <option value="sensor">sensor</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-neutral-500 block mb-1">Asset ID</label>
            <input type="text" placeholder="e.g. DRONE-001" value={assetId} onChange={(e) => setAssetId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleQuery()} className={INPUT} />
          </div>
          <div className="flex items-end">
            <button onClick={handleQuery} disabled={loading} className="w-full px-3 py-2 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-md transition-colors disabled:opacity-50">
              {loading ? 'Loading...' : 'Query'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-red-400 text-xs">{error}</div>}

      {currentState && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <h3 className="text-xs font-medium text-neutral-400 mb-3">Current State</h3>
          <div className="flex items-center gap-4">
            <StatusBadge variant={STATE_COLORS[currentState.current_state] || 'neutral'} label={currentState.current_state} />
            <span className="text-[11px] text-neutral-500">Updated: {new Date(currentState.updated_at).toLocaleString('ko-KR')}</span>
          </div>
        </div>
      )}

      {currentState && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <h3 className="text-xs font-medium text-neutral-400 mb-3">State Flow</h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            {['SERVICEABLE', 'MONITORING', 'GROUNDED', 'MAINTENANCE', 'DECOMMISSIONED'].map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                  currentState.current_state === s
                    ? 'bg-white/10 text-white border border-neutral-500'
                    : 'bg-neutral-900 text-neutral-600 border border-neutral-800'
                }`}>
                  {s}
                </div>
                {s !== 'DECOMMISSIONED' && <span className="text-neutral-700 text-xs">-</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg">
          <div className="px-4 py-3 border-b border-neutral-800">
            <h3 className="text-xs font-medium text-neutral-400">Transition History ({history.length})</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] text-neutral-500 border-b border-neutral-800/50">
                <th className="text-left px-4 py-2 font-medium">From</th>
                <th className="text-left px-4 py-2 font-medium">To</th>
                <th className="text-left px-4 py-2 font-medium">Result</th>
                <th className="text-left px-4 py-2 font-medium">Gate</th>
                <th className="text-left px-4 py-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h: any, i: number) => (
                <tr key={i} className="border-b border-neutral-800/30 hover:bg-white/[0.02]">
                  <td className="px-4 py-2 text-neutral-400">{h.from_state}</td>
                  <td className="px-4 py-2 text-neutral-200">{h.to_state}</td>
                  <td className="px-4 py-2">
                    <StatusBadge variant={h.result === 'COMMITTED' ? 'ok' : h.result === 'DENIED' ? 'error' : 'warn'} label={h.result} />
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge variant={h.gate_mode === 'HARD' ? 'error' : h.gate_mode === 'SOFT' ? 'warn' : 'neutral'} label={h.gate_mode} />
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{new Date(h.committed_at || h.created_at).toLocaleString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3"><JsonViewer data={history} title="Raw JSON" /></div>
        </div>
      )}
    </div>
  );
}
