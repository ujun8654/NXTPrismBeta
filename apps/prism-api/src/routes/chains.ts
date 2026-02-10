import { FastifyInstance } from 'fastify';
import { EvidenceLedger } from '@nxtprism/evidence-ledger';

export function registerChainRoutes(app: FastifyInstance, ledger: EvidenceLedger) {
  // GET /v1/chains/:tenant_id/head — 체인 헤드 조회
  app.get('/v1/chains/:tenant_id/head', async (request, reply) => {
    const { tenant_id } = request.params as { tenant_id: string };

    const head = await ledger.getChainHead(tenant_id);

    if (!head) {
      return reply.status(404).send({ error: '체인 헤드가 없습니다 (증거가 없음)' });
    }

    return head;
  });

  // POST /v1/chains/:tenant_id/verify — 체인 무결성 검증
  app.post('/v1/chains/:tenant_id/verify', async (request, reply) => {
    const { tenant_id } = request.params as { tenant_id: string };

    const result = await ledger.verifyChain(tenant_id);

    return result;
  });

  // POST /v1/chains/:tenant_id/checkpoint — 체크포인트 생성
  app.post('/v1/chains/:tenant_id/checkpoint', async (request, reply) => {
    const { tenant_id } = request.params as { tenant_id: string };

    const checkpoint = await ledger.createCheckpoint(tenant_id);

    return reply.status(201).send(checkpoint);
  });
}
