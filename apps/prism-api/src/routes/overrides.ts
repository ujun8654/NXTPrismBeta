import { FastifyInstance } from 'fastify';
import { OverrideGovernance } from '@nxtprism/override-governance';
import type { OverrideRequest, OverrideApproval } from '@nxtprism/override-governance';

export function registerOverrideRoutes(app: FastifyInstance, governance: OverrideGovernance) {
  // POST /v1/overrides:create — Override 요청 생성
  app.post('/v1/overrides:create', async (request, reply) => {
    const body = request.body as OverrideRequest;

    if (!body.tenant_id || !body.reason_code || !body.reason_text ||
        !body.machine_id || !body.asset_ref || !body.from_state || !body.to_state) {
      return reply.status(400).send({ error: '필수 필드가 누락되었습니다' });
    }

    const record = await governance.createOverride(body);
    return reply.status(201).send(record);
  });

  // GET /v1/overrides/:override_id — Override 조회
  app.get('/v1/overrides/:override_id', async (request, reply) => {
    const { override_id } = request.params as { override_id: string };
    const record = await governance.getOverride(override_id);

    if (!record) {
      return reply.status(404).send({ error: 'Override를 찾을 수 없습니다' });
    }

    return record;
  });

  // POST /v1/overrides/:override_id/approve — Override 승인
  app.post('/v1/overrides/:override_id/approve', async (request, reply) => {
    const { override_id } = request.params as { override_id: string };
    const body = request.body as OverrideApproval;

    if (!body.role || !body.actor_id) {
      return reply.status(400).send({ error: 'role과 actor_id가 필요합니다' });
    }

    const record = await governance.approveOverride(override_id, {
      ...body,
      actor_kind: body.actor_kind || 'human',
      approved_at: body.approved_at || new Date().toISOString(),
    });
    return record;
  });

  // POST /v1/overrides/:override_id/reject — Override 거부
  app.post('/v1/overrides/:override_id/reject', async (request, reply) => {
    const { override_id } = request.params as { override_id: string };
    const body = request.body as { actor_id: string; reason: string };

    if (!body.actor_id || !body.reason) {
      return reply.status(400).send({ error: 'actor_id와 reason이 필요합니다' });
    }

    const record = await governance.rejectOverride(override_id, body.actor_id, body.reason);
    return record;
  });

  // GET /v1/overrides — Override 목록 조회
  app.get('/v1/overrides', async (request, reply) => {
    const { tenant_id, status } = request.query as { tenant_id: string; status?: string };

    if (!tenant_id) {
      return reply.status(400).send({ error: 'tenant_id가 필요합니다' });
    }

    const records = await governance.getOverridesByTenant(tenant_id, status);
    return records;
  });

  // GET /v1/overrides/kpis — Override KPI 조회
  app.get('/v1/overrides/kpis', async (request, reply) => {
    const { tenant_id } = request.query as { tenant_id: string };

    if (!tenant_id) {
      return reply.status(400).send({ error: 'tenant_id가 필요합니다' });
    }

    const kpis = await governance.getOverrideKpis(tenant_id);
    return kpis;
  });
}
