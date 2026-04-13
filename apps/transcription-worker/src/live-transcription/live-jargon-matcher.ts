/**
 * LiveJargonMatcher
 *
 * Matches jargon terms against a finalized live transcript segment.
 * Returns an array of JargonHit[] and publishes a NATS event so downstream
 * consumers (e.g., the knowledge subgraph) can react in real-time.
 *
 * Matching is string-based (case-insensitive, canonical + alt forms).
 * Confidence: 1.0 for canonical match, 0.85 for alt-form match.
 */
import { Injectable, Logger } from '@nestjs/common';
import { NatsService } from '../nats/nats.service';
import type { TermPayload } from '../jargon/jargon-knowledge-client';
import type { LiveSegment, JargonHit } from './live-transcription.types';

const NATS_SUBJECT = 'EDUSPHERE.live.jargon.detected';

@Injectable()
export class LiveJargonMatcher {
  private readonly logger = new Logger(LiveJargonMatcher.name);

  constructor(private readonly nats: NatsService) {}

  /**
   * Matches `terms` against `segment.text`.
   * Publishes NATS event if any hits are found.
   * Returns the full list of JargonHit[].
   */
  async match(
    segment: LiveSegment,
    terms: TermPayload[]
  ): Promise<JargonHit[]> {
    if (!segment.isFinal || terms.length === 0) return [];

    const hits = this.detectHits(segment, terms);

    if (hits.length > 0) {
      await this.publish(segment, hits);
    }

    return hits;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private detectHits(
    segment: LiveSegment,
    terms: TermPayload[]
  ): JargonHit[] {
    const hits: JargonHit[] = [];
    const lower = segment.text.toLowerCase();

    for (const term of terms) {
      const allForms = [term.canonicalForm, ...term.altForms];
      for (const form of allForms) {
        if (form.length < 2) continue;
        if (!lower.includes(form.toLowerCase())) continue;

        const isCanonical = form === term.canonicalForm;
        hits.push({
          termId: term.id,
          canonicalForm: term.canonicalForm,
          matchedForm: form,
          startTime: segment.startTime,
          endTime: segment.endTime,
          confidence: isCanonical ? 1.0 : 0.85,
        });
        // Only first matching form per term to avoid duplicates
        break;
      }
    }

    return hits;
  }

  private async publish(
    segment: LiveSegment,
    hits: JargonHit[]
  ): Promise<void> {
    try {
      await this.nats.publish(NATS_SUBJECT, {
        sessionId: segment.sessionId,
        tenantId: segment.tenantId,
        segmentIndex: segment.segmentIndex,
        startTime: segment.startTime,
        endTime: segment.endTime,
        hits: hits.map((h) => ({
          termId: h.termId,
          canonicalForm: h.canonicalForm,
          matchedForm: h.matchedForm,
          confidence: h.confidence,
        })),
        timestamp: new Date().toISOString(),
      });
      this.logger.debug(
        { sessionId: segment.sessionId, hitCount: hits.length },
        'Published jargon hits'
      );
    } catch (err) {
      this.logger.warn(
        { err, sessionId: segment.sessionId },
        'Failed to publish jargon hits'
      );
    }
  }
}
