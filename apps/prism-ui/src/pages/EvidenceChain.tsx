import { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import JsonViewer from '../components/JsonViewer';
import { getChainHead, verifyChain, createCheckpoint, getEvidence } from '../api';

export default function EvidenceChain() {
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
        <h2 className="text-lg font-semibold text-white">Evidence Chain</h2>
        <p className="text-xs text-neutral-500 mt-0.5">Hash chain integrity and evidence records</p>
      </div>

      <Section title="Chain Head">
        {loading ? (
          <p className="text-neutral-500 text-xs">Loading...</p>
        ) : head ? (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <InfoRow label="Sequence #" value={head.sequence_num} />
            <InfoRow label="Evidence ID" value={head.evidence_id?.slice(0, 16) + '...'} />
            <InfoRow label="Chain Hash" value={head.chain_hash?.slice(0, 24) + '...'} mono />
            <InfoRow label="Created At" value={new Date(head.created_at).toLocaleString('ko-KR')} />
          </div>
        ) : (
          <p className="text-neutral-600 text-xs">No evidence records yet</p>
        )}
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Chain Verification">
          <Btn onClick={handleVerify} loading={actionLoading === 'verify'} label="Verify Chain" />
          {verifyResult && (
            <div className="mt-3 space-y-2">
              {verifyResult.valid !== undefined && (
                <StatusBadge
                  variant={verifyResult.valid ? 'ok' : 'error'}
                  label={verifyResult.valid ? `VALID - ${verifyResult.records_checked} records` : `INVALID at seq ${verifyResult.first_invalid_at}`}
                />
              )}
              <JsonViewer data={verifyResult} title="Result JSON" />
            </div>
          )}
        </Section>

        <Section title="Merkle Checkpoint">
          <Btn onClick={handleCheckpoint} loading={actionLoading === 'checkpoint'} label="Create Checkpoint" />
          {checkpointResult && (
            <div className="mt-3">
              <JsonViewer data={checkpointResult} title="Checkpoint JSON" />
            </div>
          )}
        </Section>
      </div>

      <Section title="Evidence Lookup">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter evidence_id..."
            value={evidenceLookup}
            onChange={(e) => setEvidenceLookup(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
          />
          <Btn onClick={handleLookup} loading={actionLoading === 'lookup'} label="Search" />
        </div>
        {evidenceResult && (
          <div className="mt-3">
            <JsonViewer data={evidenceResult} title="Evidence Record" defaultExpanded />
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

function Btn({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-3 py-2 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-md transition-colors disabled:opacity-50"
    >
      {loading ? 'Processing...' : label}
    </button>
  );
}
