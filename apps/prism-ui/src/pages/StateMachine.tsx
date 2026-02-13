import { useState } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { motion } from 'framer-motion';
import StatusBadge from '../components/StatusBadge';
import JsonViewer from '../components/JsonViewer';
import { useI18n } from '../i18n';
import { getAssetState, getAssetHistory } from '../api';

const STATE_COLORS: Record<string, 'ok' | 'warn' | 'error' | 'info' | 'neutral'> = {
  SERVICEABLE: 'ok', MONITORING: 'warn', GROUNDED: 'error', MAINTENANCE: 'info', DECOMMISSIONED: 'neutral',
};
const STATES = ['SERVICEABLE', 'MONITORING', 'GROUNDED', 'MAINTENANCE', 'DECOMMISSIONED'];

export default function StateMachine() {
  const { t } = useI18n();
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

  function ts(stateKey: string) { const k = `state.${stateKey}`; const v = t(k); return v !== k ? v : stateKey; }
  function tResult(resultKey: string) { const k = `result.${resultKey}`; const v = t(k); return v !== k ? v : resultKey; }
  function tGate(gateKey: string) { const k = `gate.${gateKey}`; const v = t(k); return v !== k ? v : gateKey; }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-white/5">
        <h2 className="font-display text-sm font-semibold tracking-wider text-atc-white uppercase">
          {t('state.title')}
        </h2>
        <p className="text-[11px] text-neutral-500 mt-0.5">{t('state.desc')}</p>
      </div>

      <div className="flex-1 overflow-hidden">
        <Group orientation="horizontal" className="h-full">
          {/* ─── Left: State Machine ─── */}
          <Panel defaultSize={60} minSize={40}>
            <div className="h-full overflow-auto p-4 space-y-4">
              {/* Query Form */}
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-lg p-4">
                <h3 className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-3">{t('state.assetQuery')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-500 block mb-1">{t('state.machineId')}</label>
                    <input type="text" placeholder="drone-airworthiness" value={machineId} onChange={(e) => setMachineId(e.target.value)}
                      className="w-full px-3 py-2 glass-card rounded-md text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-atc-aqua/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-500 block mb-1">{t('state.assetType')}</label>
                    <select value={assetType} onChange={(e) => setAssetType(e.target.value)}
                      className="w-full px-3 py-2 glass-card rounded-md text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-atc-aqua/30">
                      <option value="drone">drone</option>
                      <option value="vehicle">vehicle</option>
                      <option value="sensor">sensor</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-500 block mb-1">{t('state.assetId')}</label>
                    <input type="text" placeholder="DRONE-001" value={assetId} onChange={(e) => setAssetId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                      className="w-full px-3 py-2 glass-card rounded-md text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-atc-aqua/30" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={handleQuery} disabled={loading}
                      className="w-full px-3 py-2 text-[11px] font-medium text-neutral-300 glass-panel rounded-md hover:text-atc-white hover:bg-white/5 transition-colors disabled:opacity-50">
                      {loading ? t('common.processing') : t('common.query')}
                    </button>
                  </div>
                </div>
              </motion.div>

              {error && <div className="p-3 glass-card rounded-lg glow-border-red text-atc-red text-xs">{error}</div>}

              {/* Current State + Flow */}
              {currentState && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="glass-card rounded-lg p-4">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-3">{t('state.currentState')}</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <StatusBadge variant={STATE_COLORS[currentState.current_state] || 'neutral'} label={ts(currentState.current_state)} glow />
                    <span className="text-[10px] text-neutral-500">{t('state.updated')}: {new Date(currentState.updated_at).toLocaleString('ko-KR')}</span>
                  </div>

                  {/* State Flow */}
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-2">{t('state.stateFlow')}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {STATES.map((s) => (
                      <div key={s} className="flex items-center gap-1.5">
                        <div className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          currentState.current_state === s
                            ? 'glass-panel glow-border-aqua text-atc-aqua'
                            : 'glass-card text-neutral-600'
                        }`}>
                          {ts(s)}
                        </div>
                        {s !== 'DECOMMISSIONED' && <span className="text-neutral-700 text-xs">→</span>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Transition History */}
              {history.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass-card rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5">
                    <h3 className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">{t('state.history')} ({history.length})</h3>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] text-neutral-500 border-b border-white/5">
                        <th className="text-left px-4 py-2 font-medium">{t('state.from')}</th>
                        <th className="text-left px-4 py-2 font-medium">{t('state.to')}</th>
                        <th className="text-left px-4 py-2 font-medium">{t('state.result')}</th>
                        <th className="text-left px-4 py-2 font-medium">{t('state.gate')}</th>
                        <th className="text-left px-4 py-2 font-medium">{t('common.time')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h: any, i: number) => (
                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-2 text-neutral-400">{ts(h.from_state)}</td>
                          <td className="px-4 py-2 text-neutral-200">{ts(h.to_state)}</td>
                          <td className="px-4 py-2"><StatusBadge variant={h.result === 'COMMITTED' ? 'ok' : h.result === 'DENIED' ? 'error' : 'warn'} label={tResult(h.result)} /></td>
                          <td className="px-4 py-2"><StatusBadge variant={h.gate_mode === 'HARD' ? 'error' : h.gate_mode === 'SOFT' ? 'warn' : 'neutral'} label={tGate(h.gate_mode)} /></td>
                          <td className="px-4 py-2 text-neutral-500">{new Date(h.committed_at || h.created_at).toLocaleString('ko-KR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3"><JsonViewer data={history} title={t('common.showJson')} /></div>
                </motion.div>
              )}
            </div>
          </Panel>

          <Separator />

          {/* ─── Right: Gate Token Info ─── */}
          <Panel defaultSize={40} minSize={20}>
            <div className="h-full flex flex-col border-l border-white/5">
              <div className="px-4 py-3 border-b border-white/5">
                <h3 className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Gate Token & Overrides</h3>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {currentState ? (
                  <>
                    <div className="glass-card rounded-lg p-4">
                      <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-2">Gate Mode</h4>
                      <div className="flex items-center gap-3">
                        {['HARD', 'SOFT', 'SHADOW'].map((mode) => (
                          <div key={mode} className={`px-3 py-1.5 rounded-md text-[11px] font-medium glass-card ${
                            mode === 'HARD' ? 'glow-border-red text-atc-red' : mode === 'SOFT' ? 'glow-border-orange text-atc-orange' : 'text-neutral-500'
                          }`}>
                            {tGate(mode)}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="glass-card rounded-lg p-4">
                      <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-2">Asset Info</h4>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Machine</span>
                          <span className="text-neutral-300 font-mono">{machineId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Asset</span>
                          <span className="text-neutral-300 font-mono">{assetType}/{assetId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">State</span>
                          <StatusBadge variant={STATE_COLORS[currentState.current_state] || 'neutral'} label={ts(currentState.current_state)} />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Transitions</span>
                          <span className="text-neutral-300">{history.length}</span>
                        </div>
                      </div>
                    </div>

                    <a href="/overrides" className="block glass-card rounded-lg p-4 hover:bg-white/[0.03] transition-colors group">
                      <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-1">Override Governance</h4>
                      <p className="text-[11px] text-neutral-400 group-hover:text-atc-aqua transition-colors">
                        View override requests →
                      </p>
                    </a>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-neutral-700 text-[11px]">Query an asset to see gate info</p>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}
