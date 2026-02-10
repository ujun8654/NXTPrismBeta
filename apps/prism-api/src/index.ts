import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { EvidenceLedger } from '@nxtprism/evidence-ledger';
import { PolicyEngine } from '@nxtprism/policy-engine';
import { StateMachineManager } from '@nxtprism/state-machine';
import { EvidencePackBuilder } from '@nxtprism/evidence-pack';
import { DecisionReplayer } from '@nxtprism/decision-replay';
import { OverrideGovernance } from '@nxtprism/override-governance';
import { AuditExporter } from '@nxtprism/export-audit';
import { registerEvidenceRoutes } from './routes/evidence';
import { registerChainRoutes } from './routes/chains';
import { registerPolicyRoutes } from './routes/policies';
import { registerStateMachineRoutes } from './routes/state-machines';
import { registerEvidencePackRoutes } from './routes/evidence-packs';
import { registerReplayRoutes } from './routes/replay';
import { registerOverrideRoutes } from './routes/overrides';
import { registerExportRoutes } from './routes/exports';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const ledger = new EvidenceLedger(supabase);
const policyEngine = new PolicyEngine(supabase);
const stateMachineManager = new StateMachineManager(supabase);
const packBuilder = new EvidencePackBuilder(supabase);
const replayer = new DecisionReplayer(policyEngine, packBuilder);
const overrideGovernance = new OverrideGovernance(supabase, packBuilder);
const auditExporter = new AuditExporter(supabase, ledger, packBuilder, overrideGovernance);

const app = Fastify({ logger: true });

async function start() {
  await app.register(cors, { origin: true });

  // 헬스체크
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // API v1 라우트
  registerEvidenceRoutes(app, ledger);
  registerChainRoutes(app, ledger);
  registerPolicyRoutes(app, policyEngine);
  registerStateMachineRoutes(app, stateMachineManager);
  registerEvidencePackRoutes(app, packBuilder);
  registerReplayRoutes(app, replayer);
  registerOverrideRoutes(app, overrideGovernance);
  registerExportRoutes(app, auditExporter);

  const port = Number(process.env.PORT) || 3000;
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`NXTPrism API running on http://localhost:${port}`);
}

start().catch((err) => {
  console.error('서버 시작 실패:', err);
  process.exit(1);
});
