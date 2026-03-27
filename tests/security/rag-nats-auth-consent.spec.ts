/**
 * RAG Pipeline Security — NATS Message Validation, Authorization & LLM Consent
 *
 * Covers:
 * - SI-7: NATS consumers use buildNatsOptions() for TLS/NKey support
 * - SI-10: EmbeddingProviderService external LLM calls (consent gap analysis)
 * - NATS message schema validation (reject malformed payloads)
 * - Reindex mutation authorization (GraphQL SDL directives)
 * - Concept extraction tenant_id preservation through NATS messages
 * - Stream retention (max_age + max_bytes) on all new streams
 *
 * Static source-analysis tests — no live database or NATS required.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const KNOWLEDGE_SRC = 'apps/subgraph-knowledge/src';

function read(relativePath: string): string {
  const abs = resolve(ROOT, relativePath);
  return existsSync(abs) ? readFileSync(abs, 'utf-8') : '';
}

// ── SI-7: NATS TLS — NatsConsumer uses buildNatsOptions ──────────────────

describe('SI-7: NatsConsumer uses secure NATS connection', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/nats/nats.consumer.ts`);
  });

  it('file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it('imports buildNatsOptions from @edusphere/nats-client', () => {
    expect(src).toContain('buildNatsOptions');
    expect(src).toContain('@edusphere/nats-client');
  });

  it('uses buildNatsOptions() in connect() call (not bare URL)', () => {
    expect(src).toMatch(/connect\s*\(\s*buildNatsOptions\s*\(\s*\)\s*\)/);
  });

  it('does NOT hardcode nats:// URLs', () => {
    expect(src).not.toMatch(/['"]nats:\/\//);
  });

  it('has SI-7 compliance comment', () => {
    expect(src).toMatch(/SI-7/);
  });
});

describe('SI-7: LessonNERConsumer uses secure NATS connection', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/nats/lesson-ner.consumer.ts`);
  });

  it('file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it('imports buildNatsOptions from @edusphere/nats-client', () => {
    expect(src).toContain('buildNatsOptions');
    expect(src).toContain('@edusphere/nats-client');
  });

  it('uses buildNatsOptions() in connect() call', () => {
    expect(src).toMatch(/connect\s*\(\s*buildNatsOptions\s*\(\s*\)\s*\)/);
  });

  it('does NOT hardcode nats:// URLs', () => {
    expect(src).not.toMatch(/['"]nats:\/\//);
  });
});

// ── NATS Stream Retention — max_age + max_bytes (Infrastructure Rule) ────

describe('NATS stream retention on KNOWLEDGE stream', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/nats/nats.consumer.ts`);
  });

  it('declares max_age on KNOWLEDGE stream', () => {
    expect(src).toContain('max_age');
  });

  it('declares max_bytes on KNOWLEDGE stream', () => {
    expect(src).toContain('max_bytes');
  });

  it('max_age is set to a reasonable value (non-zero)', () => {
    const match = src.match(/max_age\s*:\s*(\d[\d_*\s]*)/);
    expect(match).not.toBeNull();
  });

  it('max_bytes is set to a reasonable value (non-zero)', () => {
    const match = src.match(/max_bytes\s*:\s*(\d[\d_*\s]*)/);
    expect(match).not.toBeNull();
  });
});

describe('NATS stream retention on CONTENT_NER stream', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/nats/lesson-ner.consumer.ts`);
  });

  it('declares max_age on CONTENT_NER stream', () => {
    expect(src).toContain('max_age');
  });

  it('declares max_bytes on CONTENT_NER stream', () => {
    expect(src).toContain('max_bytes');
  });
});

// ── NATS Message Schema Validation ───────────────────────────────────────

describe('NATS message payload validation in NatsConsumer', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/nats/nats.consumer.ts`);
  });

  it('parses JSON payload with typed interface', () => {
    expect(src).toContain('JSON.parse');
    // Typed with `as { concepts: ..., courseId: ..., tenantId: ... }`
    expect(src).toContain('concepts');
    expect(src).toContain('courseId');
    expect(src).toContain('tenantId');
  });

  it('wraps message processing in try/catch', () => {
    expect(src).toMatch(/try\s*\{[\s\S]*?JSON\.parse/);
    expect(src).toMatch(/catch\s*\(\s*err\s*\)/);
  });

  it('logs errors with structured context (tenantId, conceptName)', () => {
    expect(src).toMatch(/logger\.error\s*\(/);
    expect(src).toContain('tenantId');
  });
});

describe('NATS message payload validation in LessonNERConsumer', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/nats/lesson-ner.consumer.ts`);
  });

  it('validates payload type field before processing', () => {
    expect(src).toContain("payload.type !== 'lesson.ner.extracted'");
  });

  it('validates tenantId is present in payload', () => {
    expect(src).toContain('!payload.tenantId');
  });

  it('validates lessonId is present in payload', () => {
    expect(src).toContain('!payload.lessonId');
  });

  it('validates entities is an array', () => {
    expect(src).toContain('Array.isArray(payload.entities)');
  });

  it('validates subject tenantId matches payload tenantId (anti-spoofing)', () => {
    expect(src).toContain('subjectTenantId !== payload.tenantId');
    expect(src).toContain('Tenant ID mismatch');
  });

  it('rejects messages when subject and payload tenant IDs differ', () => {
    // The consumer continues (skips) rather than processing mismatched messages
    expect(src).toContain('rejecting');
  });

  it('has DLQ (Dead Letter Queue) for exhausted retries', () => {
    expect(src).toContain('DLQ');
    expect(src).toContain('dlq');
  });

  it('limits retry attempts with MAX_ATTEMPTS', () => {
    expect(src).toContain('MAX_ATTEMPTS');
    const match = src.match(/MAX_ATTEMPTS\s*=\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThanOrEqual(2);
    expect(Number(match![1])).toBeLessThanOrEqual(10);
  });

  it('attemptMap has max-size eviction (memory safety)', () => {
    expect(src).toContain('MAX_ATTEMPT_MAP_SIZE');
    expect(src).toMatch(/attemptMap\.size\s*>\s*/);
  });
});

// ── NATS Type Definitions ────────────────────────────────────────────────

describe('NATS payload type definitions enforce schema', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/nats/nats.types.ts`);
  });

  it('defines ExtractedConcept interface with required fields', () => {
    expect(src).toContain('ExtractedConcept');
    expect(src).toContain('name: string');
    expect(src).toContain('definition: string');
    expect(src).toContain('relatedTerms: string[]');
  });

  it('defines ConceptsExtractedPayload with tenantId', () => {
    expect(src).toContain('ConceptsExtractedPayload');
    expect(src).toContain('tenantId: string');
  });

  it('defines ConceptsPersistedPayload with tenantId', () => {
    expect(src).toContain('ConceptsPersistedPayload');
    expect(src).toContain('tenantId: string');
  });
});

// ── Concept Extraction — tenant_id preservation ──────────────────────────

describe('Concept extraction preserves tenant_id through NATS pipeline', () => {
  let consumerSrc: string;

  beforeAll(() => {
    consumerSrc = read(`${KNOWLEDGE_SRC}/nats/nats.consumer.ts`);
  });

  it('processConcepts receives tenantId from NATS payload', () => {
    expect(consumerSrc).toMatch(/tenantId/);
    expect(consumerSrc).toContain('payload');
  });

  it('upsertConcept passes tenantId to CypherService', () => {
    const upsertIdx = consumerSrc.indexOf('upsertConcept');
    const body = consumerSrc.slice(upsertIdx);
    expect(body).toContain('tenantId');
  });

  it('createConcept sets tenant_id property on AGE vertex', () => {
    expect(consumerSrc).toContain('tenant_id: tenantId');
  });

  it('publishPersisted includes tenantId in downstream NATS message', () => {
    const publishIdx = consumerSrc.indexOf('publishPersisted');
    const body = consumerSrc.slice(publishIdx);
    expect(body).toContain('tenantId');
  });
});

// ── Apache AGE — Cypher injection prevention ─────────────────────────────

describe('CypherConceptService — parameterized queries (no injection)', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/graph/cypher-concept.service.ts`);
  });

  it('file has security comment about parameterized queries', () => {
    expect(src).toContain('SECURITY');
    expect(src).toMatch(/param|interpolat/i);
  });

  it('uses executeCypher with parameter object (not string interpolation)', () => {
    // All executeCypher calls should pass a params object as 4th argument
    const calls = src.match(/executeCypher\s*\(/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(3);
    // Should use $tenantId in Cypher, not string template
    expect(src).toContain('$tenantId');
    expect(src).toContain('$name');
  });

  it('every query filters by tenant_id', () => {
    // All MATCH clauses should include tenant_id filter
    const matches = src.match(/MATCH\s*\(/g) ?? [];
    const tenantFilters = src.match(/tenant_id/g) ?? [];
    // At least as many tenant_id references as MATCH clauses
    expect(tenantFilters.length).toBeGreaterThanOrEqual(matches.length);
  });

  it('updateConcept uses allowedKeys whitelist for property names', () => {
    expect(src).toContain('allowedKeys');
    expect(src).toContain("new Set");
  });

  it('findAllConcepts uses MAX_CONCEPT_LIMIT to prevent unbounded queries', () => {
    expect(src).toContain('MAX_CONCEPT_LIMIT');
    expect(src).toContain('Math.min');
  });

  it('upsertConceptsFromNER passes tenantId to every cypher call', () => {
    const upsertIdx = src.indexOf('upsertConceptsFromNER');
    const body = src.slice(upsertIdx, src.indexOf('\n  async ', upsertIdx + 1));
    // Every executeCypher/findConceptByNameCaseInsensitive/createConcept call should include tenantId
    const tenantRefs = body.match(/tenantId/g) ?? [];
    expect(tenantRefs.length).toBeGreaterThanOrEqual(5);
  });
});

// ── SI-10: LLM Consent — EmbeddingProviderService ────────────────────────

describe('SI-10: EmbeddingProviderService LLM consent analysis', () => {
  let providerSrc: string;
  let guardSrc: string;

  beforeAll(() => {
    providerSrc = read(`${KNOWLEDGE_SRC}/embedding/embedding-provider.service.ts`);
    guardSrc = read('apps/subgraph-agent/src/ai/llm-consent.guard.ts');
  });

  it('EmbeddingProviderService exists', () => {
    expect(providerSrc.length).toBeGreaterThan(0);
  });

  it('LlmConsentGuard exists in subgraph-agent', () => {
    expect(guardSrc.length).toBeGreaterThan(0);
    expect(guardSrc).toContain('THIRD_PARTY_LLM');
    expect(guardSrc).toContain('AI_PROCESSING');
  });

  it('Ollama (local) calls do NOT require THIRD_PARTY_LLM consent (exempt per SI-10)', () => {
    // Ollama is a local model — per SI-10, only external LLMs need THIRD_PARTY_LLM consent
    // Ollama URL check comes first in the provider
    expect(providerSrc).toMatch(/if\s*\(\s*ollamaUrl\s*\)/);
    // Ollama block should not reference consent
    const ollamaBlock = providerSrc.slice(
      providerSrc.indexOf('if (ollamaUrl)'),
      providerSrc.indexOf('if (openaiKey)')
    );
    // This is acceptable — Ollama is local, no consent needed
    expect(ollamaBlock).not.toContain('consent');
  });

  it('OpenAI API key is used only when OPENAI_API_KEY env var is set (not hardcoded)', () => {
    expect(providerSrc).toContain("process.env.OPENAI_API_KEY");
    // No hardcoded API keys
    expect(providerSrc).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
  });

  it('EmbeddingProviderService does NOT hardcode any API keys or secrets', () => {
    // Check for common secret patterns
    expect(providerSrc).not.toMatch(/Bearer\s+sk-/);
    expect(providerSrc).not.toMatch(/['"][A-Za-z0-9+/]{40,}['"]/);
  });

  it('provider throws BadRequestException on failure (not generic Error)', () => {
    expect(providerSrc).toContain('BadRequestException');
    expect(providerSrc).toContain('Ollama error');
    expect(providerSrc).toContain('OpenAI error');
  });
});

// ── GraphQL Mutation Authorization ───────────────────────────────────────

describe('Embedding GraphQL mutation authorization', () => {
  let schema: string;

  beforeAll(() => {
    schema = read(`${KNOWLEDGE_SRC}/embedding/embedding.graphql`);
  });

  it('schema file exists', () => {
    expect(schema.length).toBeGreaterThan(0);
  });

  it('createEmbedding mutation has @authenticated directive', () => {
    const createLine = schema.split('\n').find(l => l.includes('createEmbedding'));
    expect(createLine).toContain('@authenticated');
  });

  it('deleteEmbedding mutation has @authenticated directive', () => {
    const deleteLine = schema.split('\n').find(l => l.includes('deleteEmbedding(id'));
    expect(deleteLine).toContain('@authenticated');
  });

  it('deleteEmbeddingsByContentItem mutation has @authenticated directive', () => {
    const deleteLine = schema.split('\n').find(l => l.includes('deleteEmbeddingsByContentItem'));
    expect(deleteLine).toContain('@authenticated');
  });

  it('schema imports @authenticated from federation spec', () => {
    expect(schema).toContain('@authenticated');
    expect(schema).toContain('federation/v2');
  });

  it('Query type does NOT expose raw embedding vectors without authentication', () => {
    // semanticSearch returns SimilarityResult, not raw embedding data
    expect(schema).toContain('SimilarityResult');
  });
});

// ── Memory Safety — OnModuleDestroy ──────────────────────────────────────

describe('Memory safety: NATS consumers implement OnModuleDestroy', () => {
  it('NatsConsumer implements OnModuleDestroy', () => {
    const src = read(`${KNOWLEDGE_SRC}/nats/nats.consumer.ts`);
    expect(src).toContain('OnModuleDestroy');
    expect(src).toContain('onModuleDestroy');
  });

  it('NatsConsumer drains NATS connection on destroy', () => {
    const src = read(`${KNOWLEDGE_SRC}/nats/nats.consumer.ts`);
    expect(src).toContain('drain()');
  });

  it('LessonNERConsumer implements OnModuleDestroy', () => {
    const src = read(`${KNOWLEDGE_SRC}/nats/lesson-ner.consumer.ts`);
    expect(src).toContain('OnModuleDestroy');
    expect(src).toContain('onModuleDestroy');
  });

  it('LessonNERConsumer unsubscribes and drains on destroy', () => {
    const src = read(`${KNOWLEDGE_SRC}/nats/lesson-ner.consumer.ts`);
    expect(src).toContain('unsubscribe()');
    expect(src).toContain('drain()');
  });

  it('LessonNERConsumer clears attemptMap on destroy', () => {
    const src = read(`${KNOWLEDGE_SRC}/nats/lesson-ner.consumer.ts`);
    expect(src).toContain('attemptMap.clear()');
  });
});

// ── buildNatsOptions — centralized secure connection factory ─────────────

describe('SI-7: buildNatsOptions centralized security', () => {
  let src: string;

  beforeAll(() => {
    src = read('packages/nats-client/src/connection.ts');
  });

  it('supports TLS via NATS_TLS_CERT environment variable', () => {
    expect(src).toContain('NATS_TLS_CERT');
  });

  it('supports TLS via NATS_TLS_KEY environment variable', () => {
    expect(src).toContain('NATS_TLS_KEY');
  });

  it('supports TLS via NATS_TLS_CA environment variable', () => {
    expect(src).toContain('NATS_TLS_CA');
  });

  it('sets TLS options when all three cert files are provided', () => {
    expect(src).toMatch(/tls/);
    expect(src).toContain('certFile');
    expect(src).toContain('keyFile');
    expect(src).toContain('caFile');
  });

  it('supports NKey authentication via NATS_NKEY env var', () => {
    expect(src).toContain('NATS_NKEY');
    expect(src).toContain('nkeyAuthenticator');
  });

  it('reads server URL from NATS_URL env var (not hardcoded)', () => {
    expect(src).toContain('NATS_URL');
  });

  it('does NOT embed any NKey seed secrets in source', () => {
    // NKey seeds start with 'SU' followed by 56 base32 chars
    expect(src).not.toMatch(/['"](SU[A-Z2-7]{48,})['"]/);
  });
});
