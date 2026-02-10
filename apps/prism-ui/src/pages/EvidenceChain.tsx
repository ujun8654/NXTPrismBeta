import { useEffect, useState } from 'react';
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
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-atc-white">{t('evidence.title')}</h2>
        <p className="text-xs text-neutral-500 mt-0.5">{t('evidence.desc')}</p>
      </div>

      {/* Chain Head */}
      <Section title={t('evidence.chainHead')}>
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
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Verify */}
        <Section title={t('evidence.verifyTitle')}>
          <p className="text-[11px] text-neutral-500 mb-3">{t('evidence.verifyDesc')}</p>
          <Btn onClick={handleVerify} loading={actionLoading === 'verify'} label={t('evidence.verify')} loadingLabel={t('common.processing')} />
          {verifyResult && (
            <div className="mt-3 space-y-3">
              {verifyResult.error ? (
                <div className="p-3 bg-[#FF1320]/5 border border-[#FF1320]/20 rounded-lg text-atc-red text-xs">{verifyResult.error}</div>
              ) : (
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      variant={verifyResult.valid ? 'ok' : 'error'}
                      label={verifyResult.valid ? t('evidence.verifyValid') : t('evidence.verifyInvalid')}
                    />
                  </div>
                  {verifyResult.valid && (
                    <p className="text-[11px] text-neutral-400">{verifyResult.records_checked} {t('evidence.recordsChecked')}</p>
                  )}
                  {!verifyResult.valid && verifyResult.first_invalid_at != null && (
                    <p className="text-[11px] text-atc-red">{t('evidence.invalidAt')} #{verifyResult.first_invalid_at}</p>
                  )}
                </div>
              )}
              <JsonViewer data={verifyResult} title={t('common.showJson')} />
            </div>
          )}
        </Section>

        {/* Checkpoint */}
        <Section title={t('evidence.checkpointTitle')}>
          <p className="text-[11px] text-neutral-500 mb-3">{t('evidence.checkpointDesc')}</p>
          <Btn onClick={handleCheckpoint} loading={actionLoading === 'checkpoint'} label={t('evidence.checkpoint')} loadingLabel={t('common.processing')} />
          {checkpointResult && (
            <div className="mt-3 space-y-3">
              {checkpointResult.error ? (
                <div className="p-3 bg-[#FE930D]/5 border border-[#FE930D]/20 rounded-lg text-atc-orange text-xs">
                  {checkpointResult.error.includes('새 증거가 없습니다') || checkpointResult.error.includes('No new')
                    ? t('evidence.noNewRecords')
                    : checkpointResult.error}
                </div>
              ) : (
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2">
                  <StatusBadge variant="ok" label={t('evidence.checkpointCreated')} />
                  <div className="grid grid-cols-1 gap-1.5 text-[11px] mt-2">
                    <div><span className="text-neutral-500">{t('evidence.merkleRoot')}: </span><span className="text-neutral-300 font-mono">{checkpointResult.merkle_root?.slice(0, 32)}...</span></div>
                    <div><span className="text-neutral-500">{t('evidence.sealedRange')}: </span><span className="text-neutral-300">#{checkpointResult.sequence_from} ~ #{checkpointResult.sequence_to}</span></div>
                    <div><span className="text-neutral-500">{checkpointResult.record_count} {t('evidence.recordCount')}</span></div>
                  </div>
                </div>
              )}
              {!checkpointResult.error && <JsonViewer data={checkpointResult} title={t('common.showJson')} />}
            </div>
          )}
        </Section>
      </div>

      {/* Evidence Lookup */}
      <Section title={t('evidence.lookup')}>
        <p className="text-[11px] text-neutral-500 mb-3">{t('evidence.lookupDesc')}</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t('evidence.lookupPlaceholder')}
            value={evidenceLookup}
            onChange={(e) => setEvidenceLookup(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
          />
          <Btn onClick={handleLookup} loading={actionLoading === 'lookup'} label={t('common.search')} loadingLabel={t('common.processing')} />
        </div>
        {evidenceResult && (
          <div className="mt-3 space-y-3">
            {evidenceResult.error ? (
              <div className="p-3 bg-[#FF1320]/5 border border-[#FF1320]/20 rounded-lg text-atc-red text-xs">{evidenceResult.error}</div>
            ) : (
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <InfoRow label={t('evidence.evidenceId')} value={evidenceResult.evidence_id?.slice(0, 16) + '...'} />
                  <InfoRow label={t('evidence.eventType')} value={evidenceResult.payload?.event_type || evidenceResult.event_type || '-'} />
                  <InfoRow label={t('evidence.seqNum')} value={evidenceResult.sequence_num} />
                  <InfoRow label={t('common.createdAt')} value={new Date(evidenceResult.created_at).toLocaleString('ko-KR')} />
                  <InfoRow label={t('evidence.chainHash')} value={(evidenceResult.chain_hash?.slice(0, 24) || '-') + '...'} mono />
                </div>
              </div>
            )}
            <JsonViewer data={evidenceResult} title={t('common.showJson')} />
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
      <h3 className="text-xs font-medium text-neutral-400 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div>
      <span className="text-[11px] text-neutral-500">{label}</span>
      <div className={`text-neutral-200 text-sm ${mono ? 'font-mono text-xs' : ''}`}>{value}</div>
    </div>
  );
}

function Btn({ onClick, loading, label, loadingLabel }: { onClick: () => void; loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-3 py-2 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-md transition-colors disabled:opacity-50"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
