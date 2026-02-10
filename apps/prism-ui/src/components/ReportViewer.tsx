import StatusBadge from './StatusBadge';
import { useI18n } from '../i18n';

interface Props {
  type: string;
  data: any;
}

export default function ReportViewer({ type, data }: Props) {
  if (!data) return null;

  switch (type) {
    case 'AUDIT_REPORT': return <AuditReportView data={data} />;
    case 'CHAIN_AUDIT': return <ChainAuditView data={data} />;
    case 'COMPLIANCE_SNAPSHOT': return <ComplianceView data={data} />;
    case 'OVERRIDE_HISTORY': return <OverrideHistoryView data={data} />;
    default: return <p className="text-neutral-500 text-xs">Unknown report type: {type}</p>;
  }
}

// ─── Audit Report (종합 감사) ───

function AuditReportView({ data }: { data: any }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <SectionHeader label={t('rpt.auditReport.title')} sub={t('rpt.generatedAt') + ': ' + fmtDate(data.generated_at)} />

      {/* Chain Integrity */}
      <Panel title={t('rpt.chainIntegrity')}>
        <ChainIntegrityBlock ci={data.chain_integrity} />
      </Panel>

      {/* Evidence Stats */}
      {data.evidence_stats && (
        <Panel title={t('rpt.evidenceStats')}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Stat label={t('rpt.totalRecords')} value={data.evidence_stats.total_records} />
            <Stat label={t('rpt.byDecision')} value={data.evidence_stats.by_decision} />
            <Stat label={t('rpt.byPolicy')} value={data.evidence_stats.by_policy} />
            <Stat label={t('rpt.byTransition')} value={data.evidence_stats.by_transition} />
            {data.evidence_stats.earliest_at && <Stat label={t('rpt.earliest')} value={fmtDate(data.evidence_stats.earliest_at)} />}
            {data.evidence_stats.latest_at && <Stat label={t('rpt.latest')} value={fmtDate(data.evidence_stats.latest_at)} />}
          </div>
        </Panel>
      )}

      {/* Transition Summary */}
      {data.transition_summary && (
        <Panel title={t('rpt.transitionSummary')}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label={t('rpt.totalTransitions')} value={data.transition_summary.total_transitions} />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <CountMap title={t('rpt.byResult')} map={data.transition_summary.by_result} />
            <CountMap title={t('rpt.byGateMode')} map={data.transition_summary.by_gate_mode} />
          </div>
        </Panel>
      )}

      {/* Override KPIs */}
      {data.override_kpis && <OverrideKpiBlock kpis={data.override_kpis} />}

      {/* Policy Timeline */}
      {data.policy_timeline?.length > 0 && (
        <Panel title={t('rpt.policyTimeline')}>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-800/50">
                <th className="text-left py-1.5 font-medium">{t('rpt.policyName')}</th>
                <th className="text-left py-1.5 font-medium">{t('rpt.version')}</th>
                <th className="text-left py-1.5 font-medium">{t('common.status')}</th>
                <th className="text-left py-1.5 font-medium">{t('rpt.publishedAt')}</th>
              </tr>
            </thead>
            <tbody>
              {data.policy_timeline.map((p: any, i: number) => (
                <tr key={i} className="border-b border-neutral-800/30">
                  <td className="py-1.5 text-neutral-200">{p.name}</td>
                  <td className="py-1.5 text-neutral-400">{p.version}</td>
                  <td className="py-1.5"><StatusBadge variant={p.is_active ? 'ok' : 'neutral'} label={p.is_active ? 'Active' : 'Inactive'} /></td>
                  <td className="py-1.5 text-neutral-500">{fmtDate(p.published_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {/* Asset States */}
      {data.asset_states?.length > 0 && <AssetStatesBlock assets={data.asset_states} />}

      {/* Checkpoints */}
      {data.checkpoints?.length > 0 && <CheckpointsBlock checkpoints={data.checkpoints} />}
    </div>
  );
}

// ─── Chain Audit (체인 감사) ───

function ChainAuditView({ data }: { data: any }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <SectionHeader label={t('rpt.chainAudit.title')} sub={t('rpt.auditedAt') + ': ' + fmtDate(data.audited_at)} />

      {data.summary && (
        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-300">
          {data.summary}
        </div>
      )}

      <Panel title={t('rpt.chainIntegrity')}>
        <ChainIntegrityBlock ci={data.chain_integrity} />
      </Panel>

      {data.checkpoints?.length > 0 && <CheckpointsBlock checkpoints={data.checkpoints} />}
    </div>
  );
}

// ─── Compliance Snapshot (규정 준수) ───

function ComplianceView({ data }: { data: any }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <SectionHeader label={t('rpt.compliance.title')} sub={t('rpt.capturedAt') + ': ' + fmtDate(data.captured_at)} />

      <Panel title={t('rpt.summary')}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <StatusBadge variant={data.chain_valid ? 'ok' : 'error'} label={data.chain_valid ? t('rpt.chainValid') : t('rpt.chainInvalid')} />
          </div>
          <Stat label={t('rpt.totalEvidence')} value={data.total_evidence} />
          <Stat label={t('rpt.totalPacks')} value={data.total_packs} />
        </div>
      </Panel>

      {data.override_summary && (
        <Panel title={t('rpt.overrideSummary')}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label={t('override.total')} value={data.override_summary.total} />
            <Stat label={t('override.pending')} value={data.override_summary.pending} />
            <Stat label={t('override.executed')} value={data.override_summary.executed} />
            <Stat label={t('override.rejected')} value={data.override_summary.rejected} />
          </div>
        </Panel>
      )}

      {data.active_policies?.length > 0 && (
        <Panel title={t('rpt.activePolicies')}>
          <div className="space-y-1.5">
            {data.active_policies.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-[11px]">
                <StatusBadge variant="ok" label="Active" />
                <span className="text-neutral-200">{p.name}</span>
                <span className="text-neutral-500">v{p.version}</span>
                <span className="text-neutral-600">{fmtDate(p.published_at)}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {data.asset_states?.length > 0 && <AssetStatesBlock assets={data.asset_states} />}
    </div>
  );
}

// ─── Override History (오버라이드 이력) ───

function OverrideHistoryView({ data }: { data: any }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <SectionHeader label={t('rpt.overrideHistory.title')} sub={t('rpt.exportedAt') + ': ' + fmtDate(data.exported_at)} />

      {data.kpis && <OverrideKpiBlock kpis={data.kpis} />}

      {data.records?.length > 0 && (
        <Panel title={t('rpt.overrideRecords') + ` (${data.records.length})`}>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-800/50">
                <th className="text-left py-1.5 font-medium">{t('common.status')}</th>
                <th className="text-left py-1.5 font-medium">{t('override.reason')}</th>
                <th className="text-left py-1.5 font-medium">{t('override.transition')}</th>
                <th className="text-left py-1.5 font-medium">{t('rpt.asset')}</th>
                <th className="text-left py-1.5 font-medium">{t('common.by')}</th>
                <th className="text-left py-1.5 font-medium">{t('common.time')}</th>
              </tr>
            </thead>
            <tbody>
              {data.records.map((r: any, i: number) => (
                <tr key={i} className="border-b border-neutral-800/30">
                  <td className="py-1.5"><StatusBadge variant={statusVariant(r.status)} label={r.status} /></td>
                  <td className="py-1.5 text-neutral-300">{r.reason_code}</td>
                  <td className="py-1.5 text-neutral-400">{r.from_state} → {r.to_state}</td>
                  <td className="py-1.5 text-neutral-400">{r.asset_ref?.id || '-'}</td>
                  <td className="py-1.5 text-neutral-400">{r.requested_by}</td>
                  <td className="py-1.5 text-neutral-500">{fmtDate(r.requested_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}

// ─── Shared sub-components ───

function SectionHeader({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="border-b border-neutral-800 pb-2">
      <h4 className="text-sm font-medium text-atc-white">{label}</h4>
      <p className="text-[11px] text-neutral-500">{sub}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
      <h5 className="text-[11px] text-neutral-500 uppercase tracking-wider mb-2.5">{title}</h5>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-lg font-semibold text-atc-white">{value}</div>
      <div className="text-[11px] text-neutral-500">{label}</div>
    </div>
  );
}

function CountMap({ title, map }: { title: string; map: Record<string, number> }) {
  if (!map || Object.keys(map).length === 0) return null;
  return (
    <div>
      <div className="text-[11px] text-neutral-500 mb-1.5">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(map).map(([k, v]) => (
          <div key={k} className="px-2 py-0.5 bg-neutral-800 rounded text-[11px]">
            <span className="text-neutral-400">{k}</span>
            <span className="text-white ml-1">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChainIntegrityBlock({ ci }: { ci: any }) {
  const { t } = useI18n();
  if (!ci) return null;
  return (
    <div className="space-y-2">
      <StatusBadge variant={ci.valid ? 'ok' : 'error'} label={ci.valid ? t('rpt.chainValid') : t('rpt.chainInvalid')} />
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div><span className="text-neutral-500">{t('rpt.recordsChecked')}: </span><span className="text-neutral-200">{ci.records_checked}</span></div>
        {ci.first_invalid_at != null && <div><span className="text-atc-red">{t('rpt.invalidAtSeq')}: #{ci.first_invalid_at}</span></div>}
        {ci.error && <div className="text-atc-red col-span-2">{ci.error}</div>}
      </div>
    </div>
  );
}

function OverrideKpiBlock({ kpis }: { kpis: any }) {
  const { t } = useI18n();
  return (
    <Panel title={t('rpt.overrideKpis')}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={t('override.total')} value={kpis.total_count} />
        <Stat label={t('override.avgApproval')} value={kpis.avg_approval_minutes != null ? `${kpis.avg_approval_minutes.toFixed(1)}m` : 'N/A'} />
      </div>
      <div className="grid grid-cols-2 gap-4 mt-3">
        <CountMap title={t('rpt.byStatus')} map={kpis.by_status} />
        <CountMap title={t('rpt.byReasonCode')} map={kpis.by_reason_code} />
      </div>
    </Panel>
  );
}

function AssetStatesBlock({ assets }: { assets: any[] }) {
  const { t } = useI18n();
  return (
    <Panel title={t('rpt.assetStates')}>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-neutral-500 border-b border-neutral-800/50">
            <th className="text-left py-1.5 font-medium">{t('rpt.asset')}</th>
            <th className="text-left py-1.5 font-medium">{t('common.type')}</th>
            <th className="text-left py-1.5 font-medium">{t('common.status')}</th>
            <th className="text-left py-1.5 font-medium">{t('state.updated')}</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a: any, i: number) => (
            <tr key={i} className="border-b border-neutral-800/30">
              <td className="py-1.5 text-neutral-200">{a.asset_id}</td>
              <td className="py-1.5 text-neutral-400">{a.asset_type}</td>
              <td className="py-1.5"><StatusBadge variant={stateVariant(a.current_state)} label={a.current_state} /></td>
              <td className="py-1.5 text-neutral-500">{fmtDate(a.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function CheckpointsBlock({ checkpoints }: { checkpoints: any[] }) {
  const { t } = useI18n();
  return (
    <Panel title={t('rpt.checkpoints')}>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-neutral-500 border-b border-neutral-800/50">
            <th className="text-left py-1.5 font-medium">{t('rpt.range')}</th>
            <th className="text-left py-1.5 font-medium">{t('rpt.records')}</th>
            <th className="text-left py-1.5 font-medium">{t('rpt.merkleRoot')}</th>
            <th className="text-left py-1.5 font-medium">{t('common.createdAt')}</th>
          </tr>
        </thead>
        <tbody>
          {checkpoints.map((c: any, i: number) => (
            <tr key={i} className="border-b border-neutral-800/30">
              <td className="py-1.5 text-neutral-200">#{c.sequence_from} ~ #{c.sequence_to}</td>
              <td className="py-1.5 text-neutral-300">{c.record_count}</td>
              <td className="py-1.5 text-neutral-500 font-mono">{c.merkle_root?.slice(0, 20)}...</td>
              <td className="py-1.5 text-neutral-500">{fmtDate(c.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

// ─── Helpers ───

function fmtDate(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR');
}

function statusVariant(status: string): 'ok' | 'error' | 'warn' | 'info' | 'neutral' {
  if (status === 'EXECUTED') return 'ok';
  if (status === 'REJECTED') return 'error';
  if (status === 'PENDING_APPROVAL' || status === 'REQUESTED') return 'warn';
  return 'neutral';
}

function stateVariant(state: string): 'ok' | 'error' | 'warn' | 'info' | 'neutral' {
  if (state === 'SERVICEABLE') return 'ok';
  if (state === 'MONITORING') return 'warn';
  if (state === 'GROUNDED') return 'error';
  if (state === 'MAINTENANCE') return 'info';
  return 'neutral';
}
