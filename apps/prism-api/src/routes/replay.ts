import { FastifyInstance } from 'fastify';
import { DecisionReplayer } from '@nxtprism/decision-replay';
import type { ReplayMode } from '@nxtprism/decision-replay';

export function registerReplayRoutes(app: FastifyInstance, replayer: DecisionReplayer) {
  // POST /v1/decisions/:decision_id/replay — Decision Replay 실행
  app.post('/v1/decisions/:decision_id/replay', async (request, reply) => {
    const { decision_id } = request.params as { decision_id: string };
    const body = request.body as {
      tenant_id: string;
      mode?: ReplayMode;
      policy_input?: Record<string, unknown>;
      compare_with_current?: boolean;
    };

    if (!body.tenant_id) {
      return reply.status(400).send({ error: 'tenant_id는 필수입니다' });
    }

    try {
      const result = await replayer.replay({
        decision_id,
        tenant_id: body.tenant_id,
        mode: body.mode || 'TRACE',
        policy_input: body.policy_input,
        compare_with_current: body.compare_with_current,
      });

      return result;
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });
}
