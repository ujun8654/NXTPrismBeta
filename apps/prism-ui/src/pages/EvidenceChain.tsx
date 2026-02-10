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

  useEffect(() => {
    loadHead();
  }, []);

  async function loadHead() {
    setLoading(true);
    try {
      const h = await getChainHead();
      setHead(h);
    } catch {}
    setLoading(false);
  }

  async function handleVerify() {
    setActionLoading('verify');
    try {
      const r = await verifyChain();
      setVerifyResult(r);
    } catch (e: any) {
      setVerifyResult({ error: e.message });
    }
    setActionLoading(null);
  }

  async function handleCheckpoint() {
    setActionLoading('checkpoint');
    try {
      const r = await createCheckpoint();
      setCheckpointResult(r);
    } catch (e: any) {
      setCheckpointResult({ error: e.message });
    }
    setActionLoading(null);
  }

  async function handleLookup() {
    if (!evidenceLookup.trim()) return;
    setActionLoading('lookup');
    try {
      const r = await getEvidence(evidenceLookup.trim());
      setEvidenceResult(r);
    } catch (e: any) {
      setEvidenceResult({ error: e.message });
    }
    setActionLoading(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Evidence Chain</h2>
        <p className="text-sm text-gray-500 mt-1">해시 체인 무결성 + 증거 레코드 조회</p>
      </div>

      {/* Chain Head */}
      <Section title="Chain Head">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : head ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoRow label="Sequence #" value={head.sequence_num} />
            <InfoRow label="Evidence ID" value={head.evidence_id?.slice(0, 16) + '...'} />
            <InfoRow label="Chain Hash" value={head.chain_hash?.slice(0, 24) + '...'} mono />
            <InfoRow label="Created At" value={new Date(head.created_at).toLocaleString('ko-KR')} />
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No evidence records yet</p>
        )}
      </Section>

      {/* 액션 버튼 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Verify */}
        <Section title="Chain Verification">
          <button
            onClick={handleVerify}
            disabled={actionLoading === 'verify'}
            className="px-4 py-2 bg-green-400/10 hover:bg-green-400/20 text-green-400 border border-green-400/30 rounded text-sm transition-colors disabled:opacity-50"
          >
            {actionLoading === 'verify' ? 'Verifying...' : '▶ Verify Chain Integrity'}
          </button>
          {verifyResult && (
            <div className="mt-3">
              {verifyResult.valid !== undefined && (
                <StatusBadge
                  variant={verifyResult.valid ? 'ok' : 'error'}
                  label={verifyResult.valid ? `VALID — ${verifyResult.records_checked} records checked` : `INVALID at seq ${verifyResult.first_invalid_at}`}
                />
              )}
              <JsonViewer data={verifyResult} title="Full Result" />
            </div>
          )}
        </Section>

        {/* Checkpoint */}
        <Section title="Merkle Checkpoint">
          <button
            onClick={handleCheckpoint}
            disabled={actionLoading === 'checkpoint'}
            className="px-4 py-2 bg-blue-400/10 hover:bg-blue-400/20 text-blue-400 border border-blue-400/30 rounded text-sm transition-colors disabled:opacity-50"
          >
            {actionLoading === 'checkpoint' ? 'Creating...' : '▶ Create Checkpoint'}
          </button>
          {checkpointResult && (
            <div className="mt-3">
              <JsonViewer data={checkpointResult} title="Checkpoint Result" />
            </div>
          )}
        </Section>
      </div>

      {/* Evidence Lookup */}
      <Section title="Evidence Record Lookup">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter evidence_id..."
            value={evidenceLookup}
            onChange={(e) => setEvidenceLookup(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            className="flex-1 px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-400/50"
          />
          <button
            onClick={handleLookup}
            disabled={actionLoading === 'lookup'}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded text-sm transition-colors disabled:opacity-50"
          >
            Search
          </button>
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
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div>
      <span className="text-xs text-gray-500">{label}</span>
      <div className={`text-gray-200 ${mono ? 'font-mono text-xs' : ''}`}>{value}</div>
    </div>
  );
}
