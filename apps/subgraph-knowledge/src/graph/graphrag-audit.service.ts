import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  type Database,
  gte,
  lte,
  and,
  eq,
  count,
  schema,
} from '@edusphere/db';

/**
 * GraphragAuditService — append-only audit trail for GraphRAG queries.
 *
 * Every call to recordQuery() produces an INSERT into the audit_log table
 * with action='GRAPHRAG_QUERY'. No UPDATE or DELETE operations exist on this
 * service (immutability invariant).
 *
 * GDPR Art.32 + SOC2 CC7.2 — 7-year retention enforced at the DB level.
 */

export interface GraphragQueryParams {
  queryId: string;
  tenantId: string;
  queryText: string;
  graphPath: string[];
  sourceDocuments: string[];
  modelVersion: string;
  modelHash: string;
  answerText: string;
  confidenceScore: number;
}

export interface GraphragAuditSummary {
  total: number;
  avgConfidence: number;
  topSources: string[];
}

const GRAPHRAG_ACTION = 'GRAPHRAG_QUERY' as const;

@Injectable()
export class GraphragAuditService implements OnModuleDestroy {
  private readonly logger = new Logger(GraphragAuditService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /**
   * Records a GraphRAG query as an immutable audit log entry.
   * All query provenance (graph path, source documents, model hash,
   * confidence score) is stored in the metadata JSONB column.
   */
  async recordQuery(params: GraphragQueryParams): Promise<void> {
    try {
      await this.db.insert(schema.auditLog).values({
        tenantId: params.tenantId,
        action: GRAPHRAG_ACTION,
        resourceType: 'GRAPHRAG',
        status: 'SUCCESS',
        metadata: {
          queryId: params.queryId,
          queryText: params.queryText,
          graphPath: params.graphPath,
          sourceDocuments: params.sourceDocuments,
          modelVersion: params.modelVersion,
          modelHash: params.modelHash,
          answerText: params.answerText,
          confidenceScore: params.confidenceScore,
        },
      });
    } catch (error) {
      this.logger.error(
        { error, queryId: params.queryId, tenantId: params.tenantId },
        'GraphragAuditService: failed to record query audit entry'
      );
      throw error;
    }
  }

  /**
   * Returns an aggregate summary of GraphRAG queries for a tenant
   * within the specified date range.
   */
  async generateAuditSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<GraphragAuditSummary> {
    const rows = await this.db
      .select({
        total: count(),
        metadata: schema.auditLog.metadata,
      })
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.tenantId, tenantId),
          eq(schema.auditLog.action, GRAPHRAG_ACTION),
          gte(schema.auditLog.createdAt, startDate),
          lte(schema.auditLog.createdAt, endDate)
        )
      );

    const total = Number(rows[0]?.total ?? 0);

    // Compute average confidence and top sources across all matching rows
    const allRows = await this.db
      .select({ metadata: schema.auditLog.metadata })
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.tenantId, tenantId),
          eq(schema.auditLog.action, GRAPHRAG_ACTION),
          gte(schema.auditLog.createdAt, startDate),
          lte(schema.auditLog.createdAt, endDate)
        )
      );

    let confidenceSum = 0;
    const sourceCounts = new Map<string, number>();

    for (const row of allRows) {
      const meta = row.metadata as Record<string, unknown> | null;
      if (!meta) continue;

      const score = typeof meta['confidenceScore'] === 'number'
        ? meta['confidenceScore']
        : 0;
      confidenceSum += score;

      const sources = Array.isArray(meta['sourceDocuments'])
        ? (meta['sourceDocuments'] as string[])
        : [];
      for (const src of sources) {
        sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
      }
    }

    const avgConfidence = total > 0 ? confidenceSum / total : 0;
    const topSources = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([src]) => src);

    this.logger.log(
      { tenantId, total, avgConfidence },
      'GraphragAuditService: audit summary generated'
    );

    return { total, avgConfidence, topSources };
  }
}
