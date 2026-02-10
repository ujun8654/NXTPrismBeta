import { FastifyInstance } from 'fastify';
import { PolicyEngine } from '@nxtprism/policy-engine';

export function registerPolicyRoutes(app: FastifyInstance, engine: PolicyEngine) {
  // POST /v1/policies:publish — 정책 배포
  app.post('/v1/policies:publish', async (request, reply) => {
    const body = request.body as {
      definition: any;
      published_by: string;
    };

    if (!body.definition || !body.published_by) {
      return reply.status(400).send({ error: 'definition and published_by are required' });
    }

    const result = await engine.publishPolicy(body.definition, body.published_by);
    return reply.status(201).send(result);
  });

  // GET /v1/policies/:policy_id/active — 활성 정책 조회
  app.get('/v1/policies/:policy_id/active', async (request, reply) => {
    const { policy_id } = request.params as { policy_id: string };

    const policy = await engine.getActivePolicy(policy_id);

    if (!policy) {
      return reply.status(404).send({ error: 'Active policy not found' });
    }

    return policy;
  });

  // POST /v1/policies/:policy_id/evaluate — 정책 평가
  app.post('/v1/policies/:policy_id/evaluate', async (request, reply) => {
    const { policy_id } = request.params as { policy_id: string };
    const body = request.body as { input: Record<string, unknown> };

    if (!body.input) {
      return reply.status(400).send({ error: 'input is required' });
    }

    const result = await engine.evaluateByPolicyId(policy_id, body);
    return result;
  });
}
