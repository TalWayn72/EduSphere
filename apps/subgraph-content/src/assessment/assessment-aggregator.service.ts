/**
 * AssessmentAggregatorService — F-030: 360° Multi-Rater Assessments
 * Fetches all responses for a campaign, computes per-criterion averages by
 * rater role, generates a template-based text summary (no LLM), and persists
 * the result in assessment_results.
 * Max 150 lines — no AI/LLM calls.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';

interface CriteriaScore {
  criteriaId: string;
  label: string;
  score: number;
}

interface AggregatedCriteria {
  criteriaId: string;
  label: string;
  selfScore: number | null;
  peerAvg: number | null;
  managerScore: number | null;
  directReportAvg: number | null;
  overallAvg: number;
}

function avg(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return scores.reduce((s, v) => s + v, 0) / scores.length;
}

function roundTwo(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildSummary(criteria: AggregatedCriteria[]): string {
  if (criteria.length === 0) return 'No criteria were rated.';
  const sorted = [...criteria].sort((a, b) => b.overallAvg - a.overallAvg);
  const overall = roundTwo(
    criteria.reduce((s, c) => s + c.overallAvg, 0) / criteria.length,
  );
  const strongest = sorted[0]!;
  const weakest = sorted[sorted.length - 1]!;
  const parts: string[] = [
    `Overall score: ${overall}/5.`,
    `Strongest: ${strongest.label} (${roundTwo(strongest.overallAvg)}/5).`,
  ];
  if (weakest.criteriaId !== strongest.criteriaId) {
    parts.push(`Growth area: ${weakest.label} (${roundTwo(weakest.overallAvg)}/5).`);
  }
  return parts.join(' ');
}

@Injectable()
export class AssessmentAggregatorService {
  private readonly logger = new Logger(AssessmentAggregatorService.name);
  private readonly db = createDatabaseConnection();

  async aggregate(
    campaignId: string,
    tenantId: string,
  ): Promise<typeof schema.assessmentResults.$inferSelect> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' };

    const [campaign] = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select().from(schema.assessmentCampaigns)
        .where(and(
          eq(schema.assessmentCampaigns.id, campaignId),
          eq(schema.assessmentCampaigns.tenantId, tenantId),
        )),
    );
    if (!campaign) throw new NotFoundException(`Campaign ${campaignId} not found`);

    const responses = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select().from(schema.assessmentResponses)
        .where(and(
          eq(schema.assessmentResponses.campaignId, campaignId),
          eq(schema.assessmentResponses.tenantId, tenantId),
        )),
    );

    // Group scores by criteriaId and rater role
    const byId = new Map<string, {
      label: string;
      self: number[];
      peer: number[];
      manager: number[];
      directReport: number[];
    }>();

    for (const resp of responses) {
      const scores = resp.criteriaScores as CriteriaScore[];
      for (const cs of scores) {
        if (!byId.has(cs.criteriaId)) {
          byId.set(cs.criteriaId, { label: cs.label, self: [], peer: [], manager: [], directReport: [] });
        }
        const entry = byId.get(cs.criteriaId)!;
        if (resp.raterRole === 'SELF') entry.self.push(cs.score);
        else if (resp.raterRole === 'PEER') entry.peer.push(cs.score);
        else if (resp.raterRole === 'MANAGER') entry.manager.push(cs.score);
        else if (resp.raterRole === 'DIRECT_REPORT') entry.directReport.push(cs.score);
      }
    }

    const aggregatedScores: AggregatedCriteria[] = Array.from(byId.entries()).map(([criteriaId, data]) => {
      const all = [...data.self, ...data.peer, ...data.manager, ...data.directReport];
      return {
        criteriaId,
        label: data.label,
        selfScore: avg(data.self),
        peerAvg: avg(data.peer),
        managerScore: avg(data.manager),
        directReportAvg: avg(data.directReport),
        overallAvg: roundTwo(all.reduce((s, v) => s + v, 0) / (all.length || 1)),
      };
    });

    const summary = buildSummary(aggregatedScores);

    const [result] = await withTenantContext(this.db, ctx, async (tx) =>
      tx.insert(schema.assessmentResults)
        .values({
          campaignId,
          targetUserId: campaign.targetUserId,
          tenantId,
          aggregatedScores: aggregatedScores as unknown as Record<string, unknown>[],
          summary,
        })
        .onConflictDoUpdate({
          target: schema.assessmentResults.campaignId,
          set: { aggregatedScores: aggregatedScores as unknown as Record<string, unknown>[], summary, generatedAt: new Date() },
        })
        .returning(),
    );

    this.logger.log({ campaignId, tenantId, criteriaCount: aggregatedScores.length }, 'Assessment aggregation complete');
    return result!;
  }
}
