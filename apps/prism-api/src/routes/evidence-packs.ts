import { FastifyInstance } from 'fastify';
import { EvidencePackBuilder } from '@nxtprism/evidence-pack';
import type { BuildPackInput } from '@nxtprism/evidence-pack';
import type { EvidencePack } from '@nxtprism/core-trust';

export function registerEvidencePackRoutes(app: FastifyInstance, packBuilder: EvidencePackBuilder) {
  // POST /v1/evidence-packs/build — Evidence Pack 생성
  app.post('/v1/evidence-packs/build', async (request, reply) => {
    const body = request.body as BuildPackInput;

    if (!body.tenant_id || !body.decision || !body.context_refs || !body.policy ||
        !body.state_transition || !body.attestations || !body.integrity ||
        !body.retention || !body.privacy) {
      return reply.status(400).send({ error: '필수 필드가 누락되었습니다' });
    }

    const pack = await packBuilder.buildPack(body);
    return reply.status(201).send(pack);
  });

  // GET /v1/decisions/:decision_id/evidence-pack — Decision ID로 팩 조회
  app.get('/v1/decisions/:decision_id/evidence-pack', async (request, reply) => {
    const { decision_id } = request.params as { decision_id: string };
    const { tenant_id } = request.query as { tenant_id: string };

    if (!tenant_id) {
      return reply.status(400).send({ error: 'tenant_id query parameter가 필요합니다' });
    }

    const pack = await packBuilder.getPackByDecision(tenant_id, decision_id);

    if (!pack) {
      return reply.status(404).send({ error: 'Evidence Pack을 찾을 수 없습니다' });
    }

    return pack;
  });

  // POST /v1/evidence-packs/verify — Evidence Pack 무결성 검증
  app.post('/v1/evidence-packs/verify', async (request, reply) => {
    const body = request.body as { manifest: EvidencePack; pack_hash: string };

    if (!body.manifest || !body.pack_hash) {
      return reply.status(400).send({ error: 'manifest와 pack_hash가 필요합니다' });
    }

    const result = packBuilder.verifyPack(body.manifest, body.pack_hash);
    return result;
  });
}
