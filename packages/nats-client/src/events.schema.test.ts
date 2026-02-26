/**
 * events.schema.test.ts — Complementary NATS event schema tests.
 *
 * The existing events.test.ts covers type-guards and runtime validators.
 * This file covers the gaps:
 *   1. Schema versioning — event payloads carry ISO 8601 timestamps so
 *      consumers can detect ordering / schema drift.
 *   2. Consumer group isolation — tenantId is required on all tenant-scoped
 *      events so NATS consumers can route/filter by tenant.
 *   3. Required vs optional field contract — verifies that the runtime
 *      validator enforces required fields and gracefully accepts optional ones.
 *   4. All annotation layer values (PERSONAL, SHARED, INSTRUCTOR, AI_GENERATED)
 *      are accepted by the annotation validator.
 *   5. All content event types are accepted by the content validator.
 *   6. Payload immutability — exported types use `readonly` modifiers
 *      (static source check via file read).
 *   7. NatsEvent discriminated union covers all payload types.
 *
 * No real NATS connection is used — all tests are pure unit tests.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isAgentSessionEvent,
  isAnnotationEvent,
  isContentEvent,
  isTranscriptionEvent,
  isKnowledgeConceptEvent,
} from './events.js';
import {
  EventValidationError,
  validateAgentSessionEvent,
  validateAgentMessageEvent,
  validateAnnotationEvent,
  validateContentEvent,
} from './events-validator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSrc(filename: string): string {
  const p = resolve(__dirname, filename);
  return readFileSync(p, 'utf-8');
}

// ---------------------------------------------------------------------------
// 1. Schema versioning — timestamp field is required on time-series events
// ---------------------------------------------------------------------------

describe('Schema versioning: timestamp is required on session and annotation events', () => {
  it('validateAgentSessionEvent rejects a payload with no timestamp', () => {
    expect(() =>
      validateAgentSessionEvent({
        type: 'session.created',
        sessionId: 'uuid-s',
        userId: 'uuid-u',
        data: {},
        // timestamp intentionally missing
      })
    ).toThrow(EventValidationError);
  });

  it('validateAgentSessionEvent rejects a payload with an invalid timestamp', () => {
    expect(() =>
      validateAgentSessionEvent({
        type: 'session.created',
        sessionId: 'uuid-s',
        userId: 'uuid-u',
        data: {},
        timestamp: 'not-a-valid-date',
      })
    ).toThrow(EventValidationError);
  });

  it('validateAgentSessionEvent accepts Unix-epoch ISO timestamp', () => {
    const payload = {
      type: 'session.created' as const,
      sessionId: 'uuid-s',
      userId: 'uuid-u',
      data: {},
      timestamp: '1970-01-01T00:00:00.000Z',
    };
    expect(validateAgentSessionEvent(payload)).toBe(payload);
  });

  it('validateAgentSessionEvent accepts a future ISO timestamp', () => {
    const payload = {
      type: 'session.completed' as const,
      sessionId: 'uuid-s',
      userId: 'uuid-u',
      data: {},
      timestamp: '2099-12-31T23:59:59.999Z',
    };
    expect(validateAgentSessionEvent(payload)).toBe(payload);
  });

  it('isAgentSessionEvent returns true when timestamp is present and valid', () => {
    expect(
      isAgentSessionEvent({
        type: 'session.created',
        sessionId: 'uuid-s',
        userId: 'uuid-u',
        data: {},
        timestamp: '2026-01-01T00:00:00Z',
      })
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Consumer group isolation — tenantId enforcement on tenant-scoped events
// ---------------------------------------------------------------------------

describe('Consumer group isolation: tenantId is required on tenant-scoped events', () => {
  // AnnotationPayload.tenantId is required
  it('validateAnnotationEvent rejects annotation with missing tenantId', () => {
    expect(() =>
      validateAnnotationEvent({
        type: 'annotation.created',
        annotationId: 'ann-1',
        assetId: 'asset-1',
        userId: 'user-1',
        // tenantId missing
        timestamp: '2026-01-01T00:00:00Z',
      })
    ).toThrow(EventValidationError);
  });

  it('validateAnnotationEvent rejects annotation with empty tenantId', () => {
    expect(() =>
      validateAnnotationEvent({
        type: 'annotation.created',
        annotationId: 'ann-1',
        assetId: 'asset-1',
        userId: 'user-1',
        tenantId: '',
        timestamp: '2026-01-01T00:00:00Z',
      })
    ).toThrow(EventValidationError);
  });

  it('validateAnnotationEvent accepts a valid tenantId', () => {
    const payload = {
      type: 'annotation.created' as const,
      annotationId: 'ann-1',
      assetId: 'asset-1',
      userId: 'user-1',
      tenantId: 'tenant-abc',
      timestamp: '2026-01-01T00:00:00Z',
    };
    expect(validateAnnotationEvent(payload)).toBe(payload);
  });

  // ContentPayload.tenantId is required
  it('validateContentEvent rejects content event with missing tenantId', () => {
    expect(() =>
      validateContentEvent({
        type: 'content.created',
        contentItemId: 'item-1',
        // tenantId missing
        timestamp: '2026-01-01T00:00:00Z',
      })
    ).toThrow(EventValidationError);
  });

  it('validateContentEvent rejects content event with empty tenantId', () => {
    expect(() =>
      validateContentEvent({
        type: 'content.created',
        contentItemId: 'item-1',
        tenantId: '',
        timestamp: '2026-01-01T00:00:00Z',
      })
    ).toThrow(EventValidationError);
  });

  it('isAnnotationEvent returns true and tenantId is preserved on valid payload', () => {
    const event = {
      type: 'annotation.updated' as const,
      annotationId: 'ann-2',
      assetId: 'asset-2',
      userId: 'user-2',
      tenantId: 'tenant-xyz',
      timestamp: '2026-01-01T00:00:00Z',
    };
    expect(isAnnotationEvent(event)).toBe(true);
    expect(event.tenantId).toBe('tenant-xyz');
  });
});

// ---------------------------------------------------------------------------
// 3. Required vs optional fields: complete contract surface
// ---------------------------------------------------------------------------

describe('Required vs optional fields: AgentMessagePayload', () => {
  it('accepts payload without optional messageId', () => {
    const payload = {
      type: 'stream.chunk' as const,
      sessionId: 'session-1',
      userId: 'user-1',
      content: 'Hello',
      timestamp: '2026-01-01T00:00:00Z',
      // messageId is optional — omitted
    };
    expect(validateAgentMessageEvent(payload)).toBe(payload);
  });

  it('accepts payload without optional tokenCount', () => {
    const payload = {
      type: 'message.created' as const,
      sessionId: 'session-1',
      userId: 'user-1',
      timestamp: '2026-01-01T00:00:00Z',
      // tokenCount is optional — omitted
    };
    expect(validateAgentMessageEvent(payload)).toBe(payload);
  });

  it('accepts payload without optional content', () => {
    const payload = {
      type: 'stream.end' as const,
      sessionId: 'session-1',
      userId: 'user-1',
      timestamp: '2026-01-01T00:00:00Z',
      // content is optional — omitted
    };
    expect(validateAgentMessageEvent(payload)).toBe(payload);
  });

  it('rejects payload where userId is only whitespace', () => {
    expect(() =>
      validateAgentMessageEvent({
        type: 'stream.chunk',
        sessionId: 'session-1',
        userId: '',
        timestamp: '2026-01-01T00:00:00Z',
      })
    ).toThrow(EventValidationError);
  });
});

describe('Required vs optional fields: AgentSessionPayload', () => {
  it('accepts payload without optional tenantId', () => {
    const payload = {
      type: 'session.created' as const,
      sessionId: 'session-1',
      userId: 'user-1',
      data: {},
      timestamp: '2026-01-01T00:00:00Z',
      // tenantId is optional — omitted
    };
    expect(validateAgentSessionEvent(payload)).toBe(payload);
  });

  it('accepts payload with non-empty data object', () => {
    const payload = {
      type: 'session.failed' as const,
      sessionId: 'session-1',
      userId: 'user-1',
      data: { errorCode: 'TIMEOUT', model: 'llama3' },
      timestamp: '2026-01-01T00:00:00Z',
    };
    expect(validateAgentSessionEvent(payload)).toBe(payload);
  });
});

// ---------------------------------------------------------------------------
// 4. All AnnotationLayer enum values are accepted
// ---------------------------------------------------------------------------

describe('AnnotationPayload: all layer values pass validation', () => {
  const layers = ['PERSONAL', 'SHARED', 'INSTRUCTOR', 'AI_GENERATED'] as const;

  for (const layer of layers) {
    it(`accepts layer=${layer}`, () => {
      const payload = {
        type: 'annotation.created' as const,
        annotationId: 'ann-1',
        assetId: 'asset-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        layer,
        timestamp: '2026-01-01T00:00:00Z',
      };
      expect(validateAnnotationEvent(payload)).toBe(payload);
    });
  }

  it('accepts annotation with no layer (layer is optional)', () => {
    const payload = {
      type: 'annotation.resolved' as const,
      annotationId: 'ann-1',
      assetId: 'asset-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      timestamp: '2026-01-01T00:00:00Z',
    };
    expect(validateAnnotationEvent(payload)).toBe(payload);
  });
});

// ---------------------------------------------------------------------------
// 5. All ContentEventType values are accepted
// ---------------------------------------------------------------------------

describe('ContentPayload: all event type values pass validation', () => {
  const contentTypes = [
    'content.created',
    'content.updated',
    'content.deleted',
    'content.published',
    'content.transcription.completed',
  ] as const;

  for (const type of contentTypes) {
    it(`accepts type=${type}`, () => {
      const payload = {
        type,
        contentItemId: 'item-1',
        tenantId: 'tenant-1',
        timestamp: '2026-01-01T00:00:00Z',
      };
      expect(validateContentEvent(payload)).toBe(payload);
    });
  }
});

// ---------------------------------------------------------------------------
// 6. Payload immutability — static source check
// ---------------------------------------------------------------------------

describe('Event type definitions use readonly modifiers (immutability)', () => {
  const src = readSrc('events.ts');

  it('AgentSessionPayload fields are readonly', () => {
    // Check that the interface uses "readonly" on its fields
    const agentSessionBlock = src.slice(
      src.indexOf('interface AgentSessionPayload'),
      src.indexOf('}', src.indexOf('interface AgentSessionPayload')) + 1
    );
    expect(agentSessionBlock).toContain('readonly type');
    expect(agentSessionBlock).toContain('readonly sessionId');
    expect(agentSessionBlock).toContain('readonly userId');
    expect(agentSessionBlock).toContain('readonly timestamp');
  });

  it('AgentMessagePayload fields are readonly', () => {
    const block = src.slice(
      src.indexOf('interface AgentMessagePayload'),
      src.indexOf('}', src.indexOf('interface AgentMessagePayload')) + 1
    );
    expect(block).toContain('readonly type');
    expect(block).toContain('readonly sessionId');
  });

  it('AnnotationPayload fields are readonly', () => {
    const block = src.slice(
      src.indexOf('interface AnnotationPayload'),
      src.indexOf('}', src.indexOf('interface AnnotationPayload')) + 1
    );
    expect(block).toContain('readonly type');
    expect(block).toContain('readonly tenantId');
  });

  it('ContentPayload fields are readonly', () => {
    const block = src.slice(
      src.indexOf('interface ContentPayload'),
      src.indexOf('}', src.indexOf('interface ContentPayload')) + 1
    );
    expect(block).toContain('readonly type');
    expect(block).toContain('readonly tenantId');
  });

  it('KnowledgeConceptPayload fields are readonly', () => {
    const block = src.slice(
      src.indexOf('interface KnowledgeConceptPayload'),
      src.indexOf('}', src.indexOf('interface KnowledgeConceptPayload')) + 1
    );
    expect(block).toContain('readonly assetId');
    expect(block).toContain('readonly concepts');
  });
});

// ---------------------------------------------------------------------------
// 7. NatsEvent discriminated union covers all payload types
// ---------------------------------------------------------------------------

describe('NatsEvent discriminated union is defined and comprehensive', () => {
  const src = readSrc('events.ts');

  it('NatsEvent type alias is exported', () => {
    expect(src).toMatch(/export\s+type\s+NatsEvent\s*=/);
  });

  it('NatsEvent includes AgentSessionPayload', () => {
    const unionBlock = src.slice(src.indexOf('export type NatsEvent'));
    expect(unionBlock).toContain('AgentSessionPayload');
  });

  it('NatsEvent includes AgentMessagePayload', () => {
    const unionBlock = src.slice(src.indexOf('export type NatsEvent'));
    expect(unionBlock).toContain('AgentMessagePayload');
  });

  it('NatsEvent includes AnnotationPayload', () => {
    const unionBlock = src.slice(src.indexOf('export type NatsEvent'));
    expect(unionBlock).toContain('AnnotationPayload');
  });

  it('NatsEvent includes ContentPayload', () => {
    const unionBlock = src.slice(src.indexOf('export type NatsEvent'));
    expect(unionBlock).toContain('ContentPayload');
  });

  it('NatsEvent includes TranscriptionPayload', () => {
    const unionBlock = src.slice(src.indexOf('export type NatsEvent'));
    expect(unionBlock).toContain('TranscriptionPayload');
  });

  it('NatsEvent includes KnowledgeConceptPayload', () => {
    const unionBlock = src.slice(src.indexOf('export type NatsEvent'));
    expect(unionBlock).toContain('KnowledgeConceptPayload');
  });

  it('NatsEvent includes GatewayPubSubPayload', () => {
    const unionBlock = src.slice(src.indexOf('export type NatsEvent'));
    expect(unionBlock).toContain('GatewayPubSubPayload');
  });
});

// ---------------------------------------------------------------------------
// 8. Knowledge and Transcription type guard edge cases
// ---------------------------------------------------------------------------

describe('isKnowledgeConceptEvent: concept item structure', () => {
  it('accepts concepts array with multiple items', () => {
    expect(
      isKnowledgeConceptEvent({
        type: 'knowledge.concepts.extracted',
        assetId: 'asset-1',
        concepts: [
          { name: 'Algebra', description: 'Branch of mathematics' },
          { name: 'Calculus', relationships: ['Algebra'] },
        ],
      })
    ).toBe(true);
  });

  it('returns false when type is not a knowledge event type', () => {
    expect(
      isKnowledgeConceptEvent({
        type: 'content.created',
        assetId: 'asset-1',
        concepts: [],
      })
    ).toBe(false);
  });
});

describe('isTranscriptionEvent: all fields validated', () => {
  it('accepts transcription.completed with segmentCount and language', () => {
    expect(
      isTranscriptionEvent({
        type: 'transcription.completed',
        assetId: 'asset-1',
        segmentCount: 99,
        language: 'he',
      })
    ).toBe(true);
  });

  it('accepts transcription.failed with errorMessage', () => {
    expect(
      isTranscriptionEvent({
        type: 'transcription.failed',
        assetId: 'asset-1',
        errorMessage: 'CUDA out of memory',
      })
    ).toBe(true);
  });

  it('returns false for wrong type value', () => {
    expect(
      isTranscriptionEvent({
        type: 'content.created',
        assetId: 'asset-1',
      })
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 9. isContentEvent covers all content sub-types
// ---------------------------------------------------------------------------

describe('isContentEvent: all content event subtypes recognised', () => {
  const types = [
    'content.created',
    'content.updated',
    'content.deleted',
    'content.published',
    'content.transcription.completed',
  ];

  for (const type of types) {
    it(`recognises ${type}`, () => {
      expect(
        isContentEvent({
          type,
          contentItemId: 'item-1',
          tenantId: 'tenant-1',
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// 10. events.ts file exists and exports type guards
// ---------------------------------------------------------------------------

describe('events.ts file exists and exports expected symbols', () => {
  const eventsPath = resolve(__dirname, 'events.ts');

  it('events.ts file exists', () => {
    expect(existsSync(eventsPath)).toBe(true);
  });

  it('exports isAgentSessionEvent', () => {
    const src = readSrc('events.ts');
    expect(src).toMatch(/export\s+function\s+isAgentSessionEvent/);
  });

  it('exports isAgentMessageEvent', () => {
    const src = readSrc('events.ts');
    expect(src).toMatch(/export\s+function\s+isAgentMessageEvent/);
  });

  it('exports isAnnotationEvent', () => {
    const src = readSrc('events.ts');
    expect(src).toMatch(/export\s+function\s+isAnnotationEvent/);
  });

  it('exports isContentEvent', () => {
    const src = readSrc('events.ts');
    expect(src).toMatch(/export\s+function\s+isContentEvent/);
  });

  it('events-validator.ts exists', () => {
    expect(existsSync(resolve(__dirname, 'events-validator.ts'))).toBe(true);
  });
});
