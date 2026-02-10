import { FastifyInstance } from 'fastify';
import { EvidenceLedger } from '@nxtprism/evidence-ledger';

export function registerEvidenceRoutes(app: FastifyInstance, ledger: EvidenceLedger) {
  // POST /v1/evidence/create — 증거 생성
  app.post('/v1/evidence/create', async (request, reply) => {
    const body = request.body as {
      tenant_id: string;
      payload: Record<string, unknown>;
      decision_id?: string;
      policy_version_id?: string;
      state_transition_id?: string;
      attestation_refs?: Record<string, unknown>[];
      created_by?: string;
    };

    if (!body.tenant_id || !body.payload) {
      return reply.status(400).send({ error: 'tenant_id와 payload는 필수입니다' });
    }

    const evidence = await ledger.appendEvidence(body);
    return reply.status(201).send(evidence);
  });

  // GET /v1/evidence/:evidence_id — 증거 조회
  app.get('/v1/evidence/:evidence_id', async (request, reply) => {
    const { evidence_id } = request.params as { evidence_id: string };

    const evidence = await ledger.getEvidence(evidence_id);

    if (!evidence) {
      return reply.status(404).send({ error: '증거를 찾을 수 없습니다' });
    }

    return evidence;
  });
}
