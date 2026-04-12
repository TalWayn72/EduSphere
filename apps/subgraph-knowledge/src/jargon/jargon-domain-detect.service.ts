/**
 * JargonDomainDetectService
 *
 * LLM-based domain detection and pgvector centroid proximity computation.
 * Extracted from JargonDomainService to keep files under 300 lines.
 */
import { Injectable, Logger } from '@nestjs/common';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOllama } from 'ollama-ai-provider';
import { z } from 'zod';
import { createDatabaseConnection, schema, eq } from '@edusphere/db';
import type { JargonDomain } from '@edusphere/db';
import { EmbeddingProviderService } from '../embedding/embedding-provider.service.js';

export interface DetectedDomainResult {
  domain: JargonDomain;
  confidence: number;
  method: string;
}

const DomainDetectionSchema = z.object({
  domains: z.array(
    z.object({
      name: z.string(),
      confidence: z.number().min(0).max(1),
      reason: z.string(),
    })
  ),
});

@Injectable()
export class JargonDomainDetectService {
  private readonly logger = new Logger(JargonDomainDetectService.name);
  private readonly db = createDatabaseConnection();

  constructor(private readonly embeddingProvider: EmbeddingProviderService) {}

  async detectDomains(
    transcriptText: string,
    allDomains: JargonDomain[],
    tenantId: string
  ): Promise<DetectedDomainResult[]> {
    if (allDomains.length === 0) return [];

    const domainNames = allDomains.map((d) => d.name).join(', ');
    const truncated = transcriptText.slice(0, 6_000);

    try {
      const model = this.buildModel();
      const { object } = await generateObject({
        model: model as Parameters<typeof generateObject>[0]['model'],
        schema: DomainDetectionSchema,
        system: `You are a domain classifier for Hebrew professional terminology.
Given a transcript excerpt and a list of known domains, identify which domains are present.
Known domains: ${domainNames}
Return only domains from the known list. Confidence: 0.0–1.0.`,
        prompt: `Transcript:\n${truncated}`,
      });

      const results: DetectedDomainResult[] = [];
      for (const detected of object.domains) {
        const domain = allDomains.find(
          (d) => d.name.toLowerCase() === detected.name.toLowerCase()
        );
        if (domain) {
          results.push({
            domain,
            confidence: detected.confidence,
            method: 'LLM',
          });
        }
      }
      this.logger.log(
        { tenantId, count: results.length },
        'LLM domain detection complete'
      );
      return results;
    } catch (err) {
      this.logger.error(
        { err, tenantId },
        'LLM domain detection failed — falling back to embedding similarity'
      );
      return this.detectByEmbedding(transcriptText, allDomains, tenantId);
    }
  }

  async computeProximityPair(
    domainAId: string,
    domainBId: string
  ): Promise<number | null> {
    const embA = await this.db
      .select({ embedding: schema.jargon_term_embeddings.embedding })
      .from(schema.jargon_term_embeddings)
      .innerJoin(
        schema.jargon_terms,
        eq(schema.jargon_term_embeddings.term_id, schema.jargon_terms.id)
      )
      .where(eq(schema.jargon_terms.domain_id, domainAId))
      .limit(100);

    const embB = await this.db
      .select({ embedding: schema.jargon_term_embeddings.embedding })
      .from(schema.jargon_term_embeddings)
      .innerJoin(
        schema.jargon_terms,
        eq(schema.jargon_term_embeddings.term_id, schema.jargon_terms.id)
      )
      .where(eq(schema.jargon_terms.domain_id, domainBId))
      .limit(100);

    if (embA.length === 0 || embB.length === 0) return null;

    const centroidA = this.centroid(embA.map((r) => r.embedding as number[]));
    const centroidB = this.centroid(embB.map((r) => r.embedding as number[]));
    return this.cosineSimilarity(centroidA, centroidB);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async detectByEmbedding(
    text: string,
    domains: JargonDomain[],
    tenantId: string
  ): Promise<DetectedDomainResult[]> {
    if (!this.embeddingProvider.hasProvider()) return [];
    try {
      const textEmbedding = await this.embeddingProvider.generateEmbedding(
        text.slice(0, 2_000)
      );
      const results: DetectedDomainResult[] = [];
      for (const domain of domains) {
        const nameEmb = await this.embeddingProvider.generateEmbedding(
          domain.name + ' ' + (domain.description ?? '')
        );
        const score = this.cosineSimilarity(textEmbedding, nameEmb);
        if (score > 0.5) {
          results.push({ domain, confidence: score, method: 'EMBEDDING' });
        }
      }
      return results.sort((a, b) => b.confidence - a.confidence);
    } catch (err) {
      this.logger.error({ err, tenantId }, 'Embedding fallback also failed');
      return [];
    }
  }

  private centroid(vecs: number[][]): number[] {
    const dim = vecs[0]!.length;
    const sum = new Array(dim).fill(0) as number[];
    for (const v of vecs) {
      // eslint-disable-next-line security/detect-object-injection
      for (let i = 0; i < dim; i++) sum[i]! += v[i]!;
    }
    return sum.map((s) => s / vecs.length);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      // eslint-disable-next-line security/detect-object-injection
      dot += a[i]! * b[i]!;
      // eslint-disable-next-line security/detect-object-injection
      normA += a[i]! * a[i]!;
      // eslint-disable-next-line security/detect-object-injection
      normB += b[i]! * b[i]!;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private buildModel() {
    const openaiKey = process.env['OPENAI_API_KEY'];
    if (openaiKey) {
      const openai = createOpenAI({ apiKey: openaiKey });
      return openai('gpt-4o-mini');
    }
    const ollamaUrl = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';
    const ollama = createOllama({ baseURL: `${ollamaUrl}/api` });
    return ollama('llama3.2');
  }
}
