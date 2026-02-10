import { FastifyInstance } from 'fastify';
import { StateMachineManager } from '@nxtprism/state-machine';

export function registerStateMachineRoutes(app: FastifyInstance, manager: StateMachineManager) {
  // POST /v1/state-machines:register — 머신 정의 등록
  app.post('/v1/state-machines:register', async (request, reply) => {
    const body = request.body as { definition: any; registered_by: string };
    if (!body.definition || !body.registered_by) {
      return reply.status(400).send({ error: 'definition and registered_by are required' });
    }
    const result = await manager.registerMachine(body.definition, body.registered_by);
    return reply.status(201).send(result);
  });

  // GET /v1/state-machines/:machine_id — 머신 정의 조회
  app.get('/v1/state-machines/:machine_id', async (request, reply) => {
    const { machine_id } = request.params as { machine_id: string };
    const machine = await manager.getMachine(machine_id);
    if (!machine) return reply.status(404).send({ error: 'Machine not found' });
    return machine;
  });

  // POST /v1/state-machines/:machine_id/transitions:authorize — Gate Token 발급
  app.post('/v1/state-machines/:machine_id/transitions:authorize', async (request, reply) => {
    const { machine_id } = request.params as { machine_id: string };
    const body = request.body as any;
    const token = await manager.authorizeTransition(machine_id, body);
    return reply.status(201).send(token);
  });

  // POST /v1/state-machines/:machine_id/transitions:commit — 전이 실행
  app.post('/v1/state-machines/:machine_id/transitions:commit', async (request, reply) => {
    const body = request.body as any;
    const { machine_id } = request.params as { machine_id: string };
    body.machine_id = machine_id;
    const record = await manager.commitTransition(body);
    return reply.status(201).send(record);
  });

  // GET /v1/state-machines/:machine_id/assets/:asset_type/:asset_id/state — 자산 상태 조회
  app.get('/v1/state-machines/:machine_id/assets/:asset_type/:asset_id/state', async (request, reply) => {
    const { machine_id, asset_type, asset_id } = request.params as {
      machine_id: string; asset_type: string; asset_id: string;
    };
    const tenantId = (request.query as any).tenant_id;
    if (!tenantId) return reply.status(400).send({ error: 'tenant_id query param required' });

    const state = await manager.getAssetState(tenantId, machine_id, { type: asset_type, id: asset_id });
    if (!state) return reply.status(404).send({ error: 'Asset state not found' });
    return state;
  });

  // GET /v1/state-machines/:machine_id/assets/:asset_type/:asset_id/history — 전이 이력
  app.get('/v1/state-machines/:machine_id/assets/:asset_type/:asset_id/history', async (request, reply) => {
    const { machine_id, asset_type, asset_id } = request.params as {
      machine_id: string; asset_type: string; asset_id: string;
    };
    const tenantId = (request.query as any).tenant_id;
    if (!tenantId) return reply.status(400).send({ error: 'tenant_id query param required' });

    const history = await manager.getTransitionHistory(
      tenantId, machine_id, { type: asset_type, id: asset_id }
    );
    return history;
  });
}
