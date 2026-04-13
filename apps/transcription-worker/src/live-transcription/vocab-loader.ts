/**
 * VocabLoader
 *
 * Loads jargon terms for a lesson (via the knowledge subgraph GraphQL API),
 * builds a Whisper initialPrompt string, and caches results per session.
 *
 * Cache TTL: 10 minutes (live sessions rarely span longer without a refresh).
 * Terminology is fetched by detecting lesson domains then loading terms per domain.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  detectLessonDomains,
  loadTermsForDomain,
  type TermPayload,
} from '../jargon/jargon-knowledge-client';

interface CacheEntry {
  terms: TermPayload[];
  prompt: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1_000; // 10 minutes
const MAX_PROMPT_TERMS = 60; // keep initialPrompt under ~300 chars

@Injectable()
export class VocabLoader {
  private readonly logger = new Logger(VocabLoader.name);
  private readonly cache = new Map<string, CacheEntry>();

  /**
   * Returns a Whisper initialPrompt string for the given lesson/session.
   * Result is cached per sessionId.
   */
  async getPrompt(
    sessionId: string,
    lessonId: string,
    tenantId: string
  ): Promise<string> {
    const cached = this.cache.get(sessionId);
    if (cached && Date.now() < cached.expiresAt) {
      this.logger.debug({ sessionId }, 'VocabLoader cache hit');
      return cached.prompt;
    }

    const terms = await this.loadTerms(lessonId, tenantId);
    const prompt = this.buildPrompt(terms);

    this.cache.set(sessionId, {
      terms,
      prompt,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    this.logger.log(
      { sessionId, lessonId, termCount: terms.length },
      'VocabLoader loaded terms'
    );
    return prompt;
  }

  /** Returns the raw term list (used by live-jargon-matcher). */
  async getTerms(
    sessionId: string,
    lessonId: string,
    tenantId: string
  ): Promise<TermPayload[]> {
    const cached = this.cache.get(sessionId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.terms;
    }
    // Warm the cache via getPrompt, then return terms
    await this.getPrompt(sessionId, lessonId, tenantId);
    return this.cache.get(sessionId)?.terms ?? [];
  }

  /** Evicts the session from cache (called on stream.ended). */
  evict(sessionId: string): void {
    this.cache.delete(sessionId);
    this.logger.debug({ sessionId }, 'VocabLoader cache evicted');
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async loadTerms(
    lessonId: string,
    tenantId: string
  ): Promise<TermPayload[]> {
    try {
      const { domains } = await detectLessonDomains(lessonId, tenantId);
      const all: TermPayload[] = [];
      for (const { domain } of domains) {
        const terms = await loadTermsForDomain(domain.id, tenantId, 50);
        all.push(...terms);
      }
      return all;
    } catch (err) {
      this.logger.warn(
        { err, lessonId },
        'VocabLoader: failed to load terms — using empty vocab'
      );
      return [];
    }
  }

  private buildPrompt(terms: TermPayload[]): string {
    const forms = terms
      .slice(0, MAX_PROMPT_TERMS)
      .map((t) => t.canonicalForm)
      .join(', ');
    return forms;
  }
}
