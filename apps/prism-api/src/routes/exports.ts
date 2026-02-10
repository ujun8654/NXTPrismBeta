import { FastifyInstance } from 'fastify';
import { AuditExporter } from '@nxtprism/export-audit';

export function registerExportRoutes(app: FastifyInstance, exporter: AuditExporter) {
  // POST /v1/exports:audit-report — 종합 감사 보고서
  app.post('/v1/exports:audit-report', async (request, reply) => {
    const body = request.body as { tenant_id: string; requested_by?: string; date_from?: string; date_to?: string };

    if (!body.tenant_id) {
      return reply.status(400).send({ error: 'tenant_id가 필요합니다' });
    }

    const report = await exporter.generateAuditReport(body.tenant_id, {
      requested_by: body.requested_by || 'api',
      date_from: body.date_from,
      date_to: body.date_to,
    });
    return reply.status(201).send(report);
  });

  // POST /v1/exports:decision-export — 단일 결정 내보내기
  app.post('/v1/exports:decision-export', async (request, reply) => {
    const body = request.body as { tenant_id: string; decision_id: string; requested_by?: string };

    if (!body.tenant_id || !body.decision_id) {
      return reply.status(400).send({ error: 'tenant_id와 decision_id가 필요합니다' });
    }

    const result = await exporter.exportDecision(body.tenant_id, body.decision_id, {
      requested_by: body.requested_by || 'api',
    });
    return reply.status(201).send(result);
  });

  // POST /v1/exports:chain-audit — 체인 무결성 감사
  app.post('/v1/exports:chain-audit', async (request, reply) => {
    const body = request.body as { tenant_id: string; requested_by?: string };

    if (!body.tenant_id) {
      return reply.status(400).send({ error: 'tenant_id가 필요합니다' });
    }

    const result = await exporter.auditChainIntegrity(body.tenant_id, {
      requested_by: body.requested_by || 'api',
    });
    return reply.status(201).send(result);
  });

  // POST /v1/exports:compliance-snapshot — 규정 준수 스냅샷
  app.post('/v1/exports:compliance-snapshot', async (request, reply) => {
    const body = request.body as { tenant_id: string; requested_by?: string };

    if (!body.tenant_id) {
      return reply.status(400).send({ error: 'tenant_id가 필요합니다' });
    }

    const result = await exporter.generateComplianceSnapshot(body.tenant_id, {
      requested_by: body.requested_by || 'api',
    });
    return reply.status(201).send(result);
  });

  // POST /v1/exports:override-history — Override 이력 내보내기
  app.post('/v1/exports:override-history', async (request, reply) => {
    const body = request.body as { tenant_id: string; requested_by?: string };

    if (!body.tenant_id) {
      return reply.status(400).send({ error: 'tenant_id가 필요합니다' });
    }

    const result = await exporter.exportOverrideHistory(body.tenant_id, {
      requested_by: body.requested_by || 'api',
    });
    return reply.status(201).send(result);
  });

  // GET /v1/exports/:export_id — 이전 내보내기 조회
  app.get('/v1/exports/:export_id', async (request, reply) => {
    const { export_id } = request.params as { export_id: string };
    const record = await exporter.getExport(export_id);

    if (!record) {
      return reply.status(404).send({ error: '내보내기를 찾을 수 없습니다' });
    }

    return record;
  });

  // GET /v1/exports — 내보내기 이력 목록
  app.get('/v1/exports', async (request, reply) => {
    const { tenant_id } = request.query as { tenant_id: string };

    if (!tenant_id) {
      return reply.status(400).send({ error: 'tenant_id가 필요합니다' });
    }

    const records = await exporter.getExportsByTenant(tenant_id);
    return records;
  });
}
