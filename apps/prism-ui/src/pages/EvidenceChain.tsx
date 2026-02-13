import { useEffect, useState } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { motion } from 'framer-motion';
import StatusBadge from '../components/StatusBadge';
import JsonViewer from '../components/JsonViewer';
import { useI18n } from '../i18n';
import { getChainHead, verifyChain, createCheckpoint, getEvidence } from '../api';

export default function EvidenceChain() {
  const { t } = useI18n();
  const [head, setHead] = useState<any>(null);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [checkpointResult, setCheckpointResult] = useState<any>(null);
  const [evidenceLookup, setEvidenceLookup] = useState('');
  const [evidenceResult, setEvidenceResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { loadHead(); }, []);

  async function loadHead() {
    setLoading(true);
    try { setHead(await getChainHead()); } catch {}
    setLoading(false);
  }

  async function handleVerify() {
    setActionLoading('verify');
    try { setVerifyResult(await verifyChain()); } catch (e: any) { setVerifyResult({ error: e.message }); }
    setActionLoading(null);
  }

  async function handleCheckpoint() {
    setActionLoading('checkpoint');
    try { setCheckpointResult(await createCheckpoint()); } catch (e: any) { setCheckpointResult({ error: e.message }); }
    setActionLoading(null);
  }

  async function handleLookup() {
    if (!evidenceLookup.trim()) return;
    setActionLoading('lookup');
    try { setEvidenceResult(await getEvidence(evidenceLookup.trim())); } catch (e: any) { setEvidenceResult({ error: e.message }); }
    setActionLoading(null);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-white/5">
        <h2 className="font-display text-sm font-semibold tracking-wider text-atc-white uppercase">
          {t('evidence.title')}
        </h2>
        <p className="text-[11px] text-neutral-500 mt-0.5">{t('evidence.desc')}</p>
      </div>

      <div className="flex-1 overflow-hidden">
        <Group orientation="horizontal" className="h-full">
          {/* ─── Left: Chain Browser ─── */}
          <Panel defaultSize={55} minSize={35}>
            <div className="h-full overflow-auto p-4 space-y-4">
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-lg p-4">
                <h3 className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-3">
                  {t('evidence.chainHead')}
                </h3>
                {loading ? (
                  <p className="text-neutral-500 text-xs">{t('common.loading')}</p>
                ) : head ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <InfoRow label={t('evidence.seqNum')} value={head.sequence_num} />
                      <InfoRow label={t('evidence.evidenceId')} value={head.evidence_id?.slice(0, 16) + '...'} />
                      <InfoRow label={t('evidence.chainHash')} value={head.chain_hash?.slice(0, 24) + '...'} mono />
                      <InfoRow label={t('common.createdAt')} value={new Date(head.created_at).toLocaleString('ko-KR')} />
                    </div>
                    <JsonViewer data={head} title={t('common.showJson')} />
                  </div>
                ) : (
                  <p className="text-neutral-600 text-xs">{t('evidence.noRecords')}</p>
                )}
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="glass-card rounded-lg p-4">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-2">{t('evidence.verifyTitle')}</h3>
                  <p className="text-[10px] text-neutral-600 mb-3">{t('evidence.verifyDesc')}</p>
                  <ActionBtn onClick={handleVerify} loading={actionLoading === 'verify'} label={t('evidence.verify')} loadingLabel={t('common.processing')} />
                  {verifyResult && (
                    <div className="mt-3 space-y-2">
                      {verifyResult.error ? (
                        <div className="p-2 glass-card rounded glow-border-red text-atc-red text-[11px]">{verifyResult.error}</div>
                      ) : (
                        <div className="p-2 glass-card rounded space-y-1">
                          <StatusBadge variant={verifyResult.valid ? 'ok' : 'error'} label={verifyResult.valid ? t('evidence.verifyValid') : t('evidence.verifyInvalid')} glow />
                          {verifyResult.valid && <p className="text-[10px] text-neutral-400">{verifyResult.records_checked} {t('evidence.recordsChecked')}</p>}
                          {!verifyResult.valid && verifyResult.first_invalid_at != null && <p className="text-[10px] text-atc-red">{t('evidence.invalidAt')} #{verifyResult.first_invalid_at}</p>}
                        </div>
                      )}
                      <JsonViewer data={verifyResult} title={t('common.showJson')} />
                    </div>
                  )}
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass-card rounded-lg p-4">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-2">{t('evidence.checkpointTitle')}</h3>
                  <p className="text-[10px] text-neutral-600 mb-3">{t('evidence.checkpointDesc')}</p>
                  <ActionBtn onClick={handleCheckpoint} loading={actionLoading === 'checkpoint'} label={t('evidence.checkpoint')} loadingLabel={t('common.processing')} />
                  {checkpointResult && (
                    <div className="mt-3 space-y-2">
                      {checkpointResult.error ? (
                        <div className="p-2 glass-card rounded glow-border-orange text-atc-orange text-[11px]">
                          {checkpointResult.error.includes('새 증거가 없습니다') || checkpointResult.error.includes('No new') ? t('evidence.noNewRecords') : checkpointResult.error}
                        </div>
                      ) : (
                        <div className="p-2 glass-card rounded space-y-1">
                          <StatusBadge variant="ok" label={t('evidence.checkpointCreated')} glow />
                          <div className="text-[10px] text-neutral-400 space-y-0.5">
                            <div>{t('evidence.merkleRoot')}: <span className="font-mono text-neutral-300">{checkpointResult.merkle_root?.slice(0, 32)}...</span></div>
                            <div>{t('evidence.sealedRange')}: #{checkpointResult.sequence_from} ~ #{checkpointResult.sequence_to}</div>
                            <div>{checkpointResult.record_count} {t('evidence.recordCount')}</div>
                          </div>
                        </div>
                      )}
                      {!checkpointResult.error && <JsonViewer data={checkpointResult} title={t('common.showJson')} />}
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </Panel>

          <Separator />

          {/* ─── Right: Evidence Inspector ─── */}
          <Panel defaultSize={45} minSize={25}>
            <div className="h-full flex flex-col border-l border-white/5">
              <div className="px-4 py-3 border-b border-white/5">
                <h3 className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Evidence Inspector</h3>
              </div>
              <div className="p-4 border-b border-white/5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('evidence.lookupPlaceholder')}
                    value={evidenceLookup}
                    onChange={(e) => setEvidenceLookup(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                    className="flex-1 px-3 py-2 glass-card rounded-md text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-atc-aqua/30"
                  />
                  <ActionBtn onClick={handleLookup} loading={actionLoading === 'lookup'} label={t('common.search')} loadingLabel={t('common.processing')} />
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {evidenceResult ? (
                  evidenceResult.error ? (
                    <div className="p-3 glass-card rounded-lg glow-border-red text-atc-red text-xs">{evidenceResult.error}</div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <InfoRow label={t('evidence.evidenceId')} value={evidenceResult.evidence_id?.slice(0, 16) + '...'} />
                        <InfoRow label={t('evidence.eventType')} value={evidenceResult.payload?.event_type || evidenceResult.event_type || '-'} />
                        <InfoRow label={t('evidence.seqNum')} value={evidenceResult.sequence_num} />
                        <InfoRow label={t('common.createdAt')} value={new Date(evidenceResult.created_at).toLocaleString('ko-KR')} />
                        <InfoRow label={t('evidence.chainHash')} value={(evidenceResult.chain_hash?.slice(0, 24) || '-') + '...'} mono />
                      </div>
                      <JsonViewer data={evidenceResult} title={t('common.showJson')} />
                    </motion.div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-neutral-700 text-[11px]">{t('evidence.lookupDesc')}</p>
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

function InfoRow({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div>
      <span className="text-[10px] text-neutral-500">{label}</span>
      <div className={`text-neutral-200 text-[12px] ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</div>
    </div>
  );
}

function ActionBtn({ onClick, loading, label, loadingLabel }: { onClick: () => void; loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="px-3 py-2 text-[11px] font-medium text-neutral-300 glass-panel rounded-md hover:text-atc-white hover:bg-white/5 transition-colors disabled:opacity-50">
      {loading ? loadingLabel : label}
    </button>
  );
}
