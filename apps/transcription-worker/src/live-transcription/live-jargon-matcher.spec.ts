import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TermPayload } from '../jargon/jargon-knowledge-client.js';
import type { LiveSegment } from './live-transcription.types.js';

// ── NATS service mock ──────────────────────────────────────────────────────
const mockNatsPublish = vi.fn().mockResolvedValue(undefined);

vi.mock('../nats/nats.service', () => ({
  NatsService: class {
    publish = mockNatsPublish;
  },
}));

import { LiveJargonMatcher } from './live-jargon-matcher.js';
import { NatsService } from '../nats/nats.service.js';

function makeSegment(text: string, isFinal = true): LiveSegment {
  return {
    sessionId: 'sess-1',
    tenantId: 'tenant-1',
    segmentIndex: 1,
    text,
    startTime: 0,
    endTime: 5,
    isFinal,
  };
}

function makeTerm(
  id: string,
  canonicalForm: string,
  altForms: string[] = []
): TermPayload {
  return { id, canonicalForm, altForms };
}

describe('LiveJargonMatcher', () => {
  let matcher: LiveJargonMatcher;
  let natsService: NatsService;

  beforeEach(() => {
    vi.clearAllMocks();
    natsService = new NatsService();
    matcher = new LiveJargonMatcher(natsService);
  });

  describe('match — canonical forms', () => {
    it('finds canonical term in segment text', async () => {
      const terms = [makeTerm('t-1', 'Ontology')];
      const segment = makeSegment('We discussed Ontology today.');
      const hits = await matcher.match(segment, terms);
      expect(hits).toHaveLength(1);
      expect(hits[0].termId).toBe('t-1');
      expect(hits[0].canonicalForm).toBe('Ontology');
      expect(hits[0].matchedForm).toBe('Ontology');
      expect(hits[0].confidence).toBe(1.0);
    });

    it('returns empty array when term not present in text', async () => {
      const terms = [makeTerm('t-1', 'Metaphysics')];
      const segment = makeSegment('We talked about logic today.');
      const hits = await matcher.match(segment, terms);
      expect(hits).toHaveLength(0);
    });
  });

  describe('match — alt forms', () => {
    it('finds alt form when canonical is absent', async () => {
      const terms = [
        makeTerm('t-1', 'Epistemology', ['episteme', 'gnoseology']),
      ];
      const segment = makeSegment('The concept of episteme was central.');
      const hits = await matcher.match(segment, terms);
      expect(hits).toHaveLength(1);
      expect(hits[0].matchedForm).toBe('episteme');
      expect(hits[0].confidence).toBe(0.85);
    });

    it('prefers canonical form match over alt form', async () => {
      const terms = [makeTerm('t-1', 'Epistemology', ['episteme'])];
      const segment = makeSegment('Epistemology and episteme are related.');
      const hits = await matcher.match(segment, terms);
      // Only one hit per term (breaks after first match)
      expect(hits).toHaveLength(1);
      expect(hits[0].matchedForm).toBe('Epistemology');
      expect(hits[0].confidence).toBe(1.0);
    });
  });

  describe('match — case-insensitive matching', () => {
    it('matches regardless of case in text', async () => {
      const terms = [makeTerm('t-1', 'Ontology')];
      const segment = makeSegment('This is about ONTOLOGY and ontology.');
      const hits = await matcher.match(segment, terms);
      expect(hits).toHaveLength(1);
    });

    it('matches uppercase canonical against lowercase text', async () => {
      const terms = [makeTerm('t-1', 'EPISTEMOLOGY')];
      const segment = makeSegment('we study epistemology in philosophy.');
      const hits = await matcher.match(segment, terms);
      expect(hits).toHaveLength(1);
    });
  });

  describe('match — edge cases', () => {
    it('returns empty array when terms list is empty', async () => {
      const segment = makeSegment('Any text here.');
      const hits = await matcher.match(segment, []);
      expect(hits).toHaveLength(0);
    });

    it('returns empty array when segment is not final', async () => {
      const terms = [makeTerm('t-1', 'Ontology')];
      const segment = makeSegment('Ontology discussed here.', false);
      const hits = await matcher.match(segment, terms);
      expect(hits).toHaveLength(0);
    });

    it('does not match terms shorter than 2 characters', async () => {
      const terms = [makeTerm('t-1', 'a', ['x'])];
      const segment = makeSegment('a x b y some text here.');
      const hits = await matcher.match(segment, terms);
      expect(hits).toHaveLength(0);
    });

    it('matches multiple distinct terms in same segment', async () => {
      const terms = [
        makeTerm('t-1', 'Ontology'),
        makeTerm('t-2', 'Epistemology'),
      ];
      const segment = makeSegment('We study Ontology and Epistemology.');
      const hits = await matcher.match(segment, terms);
      expect(hits).toHaveLength(2);
    });
  });

  describe('NATS publishing', () => {
    it('publishes NATS event when hits are found', async () => {
      const terms = [makeTerm('t-1', 'Ontology')];
      const segment = makeSegment('Ontology is key.');
      await matcher.match(segment, terms);
      expect(mockNatsPublish).toHaveBeenCalledOnce();
      const [subject, payload] = mockNatsPublish.mock.calls[0] as [
        string,
        { hits: unknown[] },
      ];
      expect(subject).toBe('EDUSPHERE.live.jargon.detected');
      expect(payload.hits).toHaveLength(1);
    });

    it('does not publish when no hits found', async () => {
      const terms = [makeTerm('t-1', 'Metaphysics')];
      const segment = makeSegment('Nothing relevant here.');
      await matcher.match(segment, terms);
      expect(mockNatsPublish).not.toHaveBeenCalled();
    });

    it('still returns hits even when NATS publish fails', async () => {
      mockNatsPublish.mockRejectedValueOnce(new Error('NATS unavailable'));
      const terms = [makeTerm('t-1', 'Ontology')];
      const segment = makeSegment('Ontology is key.');
      const hits = await matcher.match(segment, terms);
      expect(hits).toHaveLength(1);
    });
  });
});
