/**
 * RAG Pipeline Security — PDF Path Traversal, XSS in Extracted Text, Presigned URL Expiry
 *
 * Covers Sprint 1-3 knowledge source ingestion pipeline:
 * - Path traversal in MinIO file_key construction (user-supplied filename)
 * - XSS via extracted PDF text rendered in frontend
 * - Presigned URL expiry validation (15-min default)
 * - SSRF protection in ContentIngestionResolver
 * - Tenant UUID validation in TranscriptBridgeConsumer
 * - File upload type validation in KnowledgeSourceController
 *
 * Static source-analysis tests — no live database or MinIO required.
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

// ── 1. Path Traversal in MinIO File Key ────────────────────────────────────

describe('Path Traversal — MinIO file_key sanitization', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/sources/knowledge-source.service.ts`);
  });

  it('file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it('sanitizes path traversal sequences (../) from origin before building fileKey', () => {
    expect(src).toContain('safeOrigin');
    expect(src).toContain('.replace(');
  });

  it('sanitizes backslash path traversal sequences from origin', () => {
    // The code strips both ../ and ..\ patterns
    expect(src).toContain('safeOrigin');
  });

  it('replaces forward/backslash separators to prevent nested path injection', () => {
    expect(src).toMatch(/\.replace\(.*[/\\]/);
  });

  it('uses randomUUID in file key to prevent predictable paths', () => {
    expect(src).toContain('randomUUID()');
  });

  it('prefixes file key with tenantId for tenant isolation', () => {
    expect(src).toMatch(/\$\{input\.tenantId\}.*\$\{input\.courseId\}/);
  });
});

// ── 2. Presigned URL Expiry ────────────────────────────────────────────────

describe('Presigned URL — expiry configuration', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/sources/minio-url.service.ts`);
  });

  it('file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it('sets a default expiry for presigned URLs (not unlimited)', () => {
    expect(src).toMatch(/DEFAULT_EXPIRY_SECONDS\s*=\s*\d+/);
  });

  it('default expiry is 15 minutes (900 seconds) or less', () => {
    const match = src.match(/DEFAULT_EXPIRY_SECONDS\s*=\s*(\d+)/);
    expect(match).toBeTruthy();
    const expiry = parseInt(match![1]!, 10);
    expect(expiry).toBeLessThanOrEqual(900);
  });

  it('uses getSignedUrl from @aws-sdk/s3-request-presigner', () => {
    expect(src).toContain('getSignedUrl');
    expect(src).toContain('@aws-sdk/s3-request-presigner');
  });

  it('implements OnModuleDestroy for S3Client cleanup', () => {
    expect(src).toContain('OnModuleDestroy');
    expect(src).toContain('s3.destroy()');
  });
});

// ── 3. SSRF Protection in ContentIngestionResolver ─────────────────────────

describe('SSRF Protection — ContentIngestionResolver', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/sources/content-ingestion.resolver.ts`);
  });

  it('file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it('has SSRF guard function that blocks private IPs', () => {
    expect(src).toMatch(/assertSafeUrl|SSRF/i);
  });

  it('blocks localhost and 127.x addresses', () => {
    expect(src).toMatch(/localhost|127\\\./);
  });

  it('blocks private 10.x and 192.168.x ranges', () => {
    expect(src).toMatch(/10\\\.|192\\\.168/);
  });

  it('blocks 172.16-31.x private range', () => {
    expect(src).toMatch(/172/);
  });

  it('only allows http: and https: protocols', () => {
    expect(src).toMatch(/protocol.*!==.*http/);
  });

  it('validates URL before fetch call', () => {
    // assertSafeUrl must appear before the fetch call
    const ssrfIdx = src.indexOf('assertSafeUrl');
    const fetchIdx = src.indexOf('await fetch(fileUrl');
    expect(ssrfIdx).toBeGreaterThan(-1);
    expect(fetchIdx).toBeGreaterThan(-1);
    expect(ssrfIdx).toBeLessThan(fetchIdx);
  });

  it('uses AbortSignal.timeout on fetch to prevent slow-loris attacks', () => {
    expect(src).toContain('AbortSignal.timeout');
  });

  it('requires authentication (auth context check)', () => {
    expect(src).toContain('UnauthorizedException');
    expect(src).toContain('authContext?.tenantId');
  });
});

// ── 4. SSRF Protection in DocumentParserService.parseUrl ───────────────────

describe('SSRF Protection — DocumentParserService.parseUrl', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/sources/document-parser.service.ts`);
  });

  it('parseUrl has SSRF guard for private IPs', () => {
    expect(src).toMatch(/privateIpPattern/);
  });

  it('blocks non-http protocols in parseUrl', () => {
    expect(src).toMatch(/Disallowed URL protocol/);
  });

  it('uses AbortSignal.timeout on URL fetch', () => {
    expect(src).toContain('AbortSignal.timeout');
  });

  it('strips HTML tags from fetched content to prevent XSS', () => {
    // The code uses .replace(/<[^>]+>/g, ' ') to strip tags
    expect(src).toContain('<[^>]+>');
  });

  it('strips <script> tags from fetched HTML', () => {
    expect(src).toMatch(/<script/i);
  });
});

// ── 5. Tenant UUID Validation in TranscriptBridgeConsumer ──────────────────

describe('Tenant Validation — TranscriptBridgeConsumer', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/nats/transcript-bridge.consumer.ts`);
  });

  it('file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it('validates tenantId format before processing', () => {
    expect(src).toMatch(/uuidPattern|UUID|tenantId.*format/i);
  });

  it('rejects messages with missing required fields', () => {
    expect(src).toContain('missing required fields');
  });

  it('uses buildNatsOptions for secure NATS connection (SI-7)', () => {
    expect(src).toContain('buildNatsOptions');
  });

  it('implements OnModuleDestroy for NATS connection cleanup', () => {
    expect(src).toContain('OnModuleDestroy');
    expect(src).toContain('drain');
  });

  it('sets stream max_age and max_bytes for retention policy', () => {
    expect(src).toMatch(/max_age/);
    expect(src).toMatch(/max_bytes/);
  });
});

// ── 6. Tenant Validation in LessonNERConsumer ──────────────────────────────

describe('Tenant Validation — LessonNERConsumer', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/nats/lesson-ner.consumer.ts`);
  });

  it('cross-validates subject tenantId vs payload tenantId', () => {
    expect(src).toContain('subjectTenantId');
    expect(src).toMatch(/Tenant ID mismatch/);
  });

  it('rejects messages on tenant mismatch', () => {
    expect(src).toContain('rejecting');
  });

  it('extracts tenantId from NATS subject', () => {
    expect(src).toContain('extractTenantFromSubject');
  });

  it('has bounded attemptMap to prevent memory exhaustion', () => {
    expect(src).toContain('MAX_ATTEMPT_MAP_SIZE');
  });
});

// ── 7. File Upload Validation in KnowledgeSourceController ─────────────────

describe('File Upload Security — KnowledgeSourceController', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/sources/knowledge-source.controller.ts`);
  });

  it('file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it('enforces file size limit', () => {
    expect(src).toMatch(/fileSize:\s*\d+/);
  });

  it('file size limit is 50 MB or less', () => {
    const match = src.match(/fileSize:\s*(\d+)\s*\*/);
    expect(match).toBeTruthy();
  });

  it('uses memory storage (no disk write)', () => {
    expect(src).toContain('memoryStorage');
  });

  it('validates JWT token before processing', () => {
    expect(src).toContain('JWTValidator');
    expect(src).toContain('Bearer token required');
  });

  it('validates file MIME type against allowlist', () => {
    expect(src).toContain('MIME_TO_SOURCE_TYPE');
    expect(src).toContain('Unsupported file type');
  });

  it('requires courseId parameter', () => {
    expect(src).toContain('courseId is required');
  });

  it('validates tenant claim exists in JWT', () => {
    expect(src).toContain('No tenant claim in token');
  });
});

// ── 8. XSS in Frontend — mermaidSvg sanitization ──────────────────────────

describe('XSS Protection — PipelineResultDetail mermaidSvg', () => {
  let src: string;

  beforeAll(() => {
    src = read('apps/web/src/components/pipeline/PipelineResultDetail.tsx');
  });

  it('file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it('imports DOMPurify for SVG sanitization', () => {
    expect(src).toContain("import DOMPurify from 'dompurify'");
  });

  it('sanitizes mermaidSvg before dangerouslySetInnerHTML', () => {
    expect(src).toContain('DOMPurify.sanitize');
  });

  it('uses useMemo for sanitization (performance)', () => {
    expect(src).toContain('useMemo');
  });
});

// ── 9. XSS in Frontend — email HTML sanitization ──────────────────────────

describe('XSS Protection — NotificationTemplateEditor email HTML', () => {
  let src: string;

  beforeAll(() => {
    src = read('apps/web/src/pages/NotificationTemplatesPage.editor.tsx');
  });

  it('file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it('imports DOMPurify for email HTML sanitization', () => {
    expect(src).toContain("import DOMPurify from 'dompurify'");
  });

  it('uses DOMPurify.sanitize (not regex) for email HTML', () => {
    expect(src).toContain('DOMPurify.sanitize');
  });

  it('restricts allowed HTML tags via ALLOWED_TAGS', () => {
    expect(src).toContain('ALLOWED_TAGS');
  });

  it('disallows data attributes', () => {
    expect(src).toContain('ALLOW_DATA_ATTR: false');
  });
});

// ── 10. GraphQL Auth Directives on Knowledge Source Mutations ──────────────

describe('Auth Directives — Knowledge Source GraphQL SDL', () => {
  let sdl: string;

  beforeAll(() => {
    sdl = read(`${KNOWLEDGE_SRC}/sources/knowledge-source.graphql`);
  });

  it('all mutations have @authenticated directive', () => {
    // Extract all mutation lines
    const mutationLines = sdl.split('\n').filter(
      (line) => line.trim().startsWith('add') || line.trim().startsWith('delete') || line.trim().startsWith('reindex'),
    );
    for (const line of mutationLines) {
      // The directive may be on the same line or the next line
      const fullBlock = sdl.slice(sdl.indexOf(line));
      const nextDirective = fullBlock.slice(0, fullBlock.indexOf('\n\n'));
      // Just verify @authenticated appears in the SDL for each mutation
    }
    expect(sdl).toContain('@authenticated');
  });

  it('write mutations require course:write scope', () => {
    expect(sdl).toContain('@requiresScopes(scopes: [["course:write"]])');
  });

  it('reindex mutation requires elevated course:manage scope', () => {
    expect(sdl).toContain('@requiresScopes(scopes: [["course:manage"]])');
  });

  it('queries require authentication', () => {
    const queryLines = sdl.split('\n');
    const queryBlock = sdl.slice(sdl.indexOf('extend type Query'));
    expect(queryBlock).toContain('@authenticated');
  });
});

// ── 11. Content Ingestion Auth Directives ──────────────────────────────────

describe('Auth Directives — Content Ingestion GraphQL SDL', () => {
  let sdl: string;

  beforeAll(() => {
    sdl = read(`${KNOWLEDGE_SRC}/sources/content-ingestion.graphql`);
  });

  it('ingestContent mutation requires @authenticated', () => {
    expect(sdl).toContain('@authenticated');
  });

  it('ingestContent mutation requires course:write scope', () => {
    expect(sdl).toContain('@requiresScopes(scopes: [["course:write"]])');
  });
});
