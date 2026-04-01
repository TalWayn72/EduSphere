/**
 * Static security tests for Phase 5 AI Compliance.
 * SI-10: LLM calls must check THIRD_PARTY_LLM consent before execution.
 * EU AI Act: AI-generated content must be labeled; PII must be scrubbed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const read = (p: string) =>
  existsSync(resolve(ROOT, p)) ? readFileSync(resolve(ROOT, p), 'utf-8') : '';

describe('SI-10: LLM Consent Gate', () => {
  it('llm-consent.guard.ts exists', () => {
    expect(
      existsSync(
        resolve(ROOT, 'apps/subgraph-agent/src/ai/llm-consent.guard.ts')
      )
    ).toBe(true);
  });

  it('consent guard checks THIRD_PARTY_LLM consent type', () => {
    const c = read('apps/subgraph-agent/src/ai/llm-consent.guard.ts');
    expect(c).toContain('THIRD_PARTY_LLM');
  });

  it('consent guard checks AI_PROCESSING for local LLM', () => {
    const c = read('apps/subgraph-agent/src/ai/llm-consent.guard.ts');
    expect(c).toContain('AI_PROCESSING');
  });

  it('consent guard throws CONSENT_REQUIRED error code', () => {
    const c = read('apps/subgraph-agent/src/ai/llm-consent.guard.ts');
    expect(c).toContain('CONSENT_REQUIRED');
  });

  it('consent guard includes settings URL in error extension', () => {
    const c = read('apps/subgraph-agent/src/ai/llm-consent.guard.ts');
    expect(c).toContain('settingsUrl');
  });

  it('consent guard has unit tests', () => {
    expect(
      existsSync(
        resolve(ROOT, 'apps/subgraph-agent/src/ai/llm-consent.guard.spec.ts')
      )
    ).toBe(true);
  });
});

describe('EU AI Act: PII Scrubbing', () => {
  it('pii-scrubber.ts exists', () => {
    expect(
      existsSync(resolve(ROOT, 'apps/subgraph-agent/src/ai/pii-scrubber.ts'))
    ).toBe(true);
  });

  it('PII scrubber detects email addresses', () => {
    const c = read('apps/subgraph-agent/src/ai/pii-scrubber.ts');
    expect(c).toContain('EMAIL');
    expect(c).toContain('@');
  });

  it('PII scrubber detects phone numbers', () => {
    const c = read('apps/subgraph-agent/src/ai/pii-scrubber.ts');
    expect(c).toMatch(/PHONE|phone/i);
  });

  it('PII scrubber detects IP addresses', () => {
    const c = read('apps/subgraph-agent/src/ai/pii-scrubber.ts');
    expect(c).toContain('IP_ADDRESS');
  });

  it('PII scrubber returns redactedCount metadata', () => {
    const c = read('apps/subgraph-agent/src/ai/pii-scrubber.ts');
    expect(c).toContain('redactedCount');
  });

  it('PII scrubber has unit tests', () => {
    expect(
      existsSync(
        resolve(ROOT, 'apps/subgraph-agent/src/ai/pii-scrubber.spec.ts')
      )
    ).toBe(true);
  });
});

describe('BUG-093: Course generation timeout configuration', () => {
  it('WORKFLOW_TIMEOUT_MS in course-generator.service.ts is >= 10 minutes (600000ms)', () => {
    const src = read('apps/subgraph-agent/src/ai/course-generator.service.ts');
    expect(src).toBeTruthy();
    // Extract the timeout value — pattern: WORKFLOW_TIMEOUT_MS = 10 * 60 * 1000 or a numeric literal
    const literalMatch = src.match(/WORKFLOW_TIMEOUT_MS\s*=\s*(\d[\d_]*)/);
    const exprMatch = src.match(
      /WORKFLOW_TIMEOUT_MS\s*=\s*(\d+)\s*\*\s*(\d+)\s*\*\s*(\d+)/
    );
    let timeoutMs = 0;
    if (exprMatch) {
      timeoutMs =
        Number(exprMatch[1]) * Number(exprMatch[2]) * Number(exprMatch[3]);
    } else if (literalMatch) {
      timeoutMs = Number(literalMatch[1].replace(/_/g, ''));
    }
    expect(timeoutMs).toBeGreaterThanOrEqual(600_000);
  });

  it('EXECUTION_TIMEOUT_MS in agent.service.ts is >= 10 minutes (600000ms)', () => {
    const src = read('apps/subgraph-agent/src/agent/agent.service.ts');
    expect(src).toBeTruthy();
    const match = src.match(/EXECUTION_TIMEOUT_MS\s*=\s*(\d[\d_]*)/);
    expect(match).not.toBeNull();
    const timeoutMs = Number(match![1].replace(/_/g, ''));
    expect(timeoutMs).toBeGreaterThanOrEqual(600_000);
  });
});

describe('BUG-092R2: AI SDK Version Compatibility', () => {
  it('@ai-sdk/openai version compatible with ai SDK (spec v2 match)', () => {
    const pkg = read('apps/subgraph-agent/package.json');
    const parsed = JSON.parse(pkg);
    const openaiDep = parsed.dependencies['@ai-sdk/openai'] || '';
    // v2.x = spec v2 (compatible with ai@5.0.x)
    // v3.x = spec v3 (requires ai@5.1.x+) — MUST NOT be used
    expect(openaiDep).not.toMatch(/\^3\./);
    expect(openaiDep).not.toMatch(/\^4\./);
  });
});
