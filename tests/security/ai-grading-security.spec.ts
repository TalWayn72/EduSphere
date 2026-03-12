/**
 * Static security tests for Phase 53 AI Grading (AutoGradingService).
 *
 * Asserts security invariants in auto-grading.service.ts without executing any LLM calls:
 * - XSS prevention via HTML stripping
 * - SI-3 prompt injection prevention via JSON.stringify
 * - PII protection — student answer text never logged
 * - Input validation via BadRequestException
 * - Bounded input size (memory safety — no unbounded strings)
 * - OLLAMA_URL read from env (not hardcoded)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const SERVICE_PATH = 'apps/subgraph-agent/src/ai/auto-grading.service.ts';

const read = (p: string): string =>
  existsSync(resolve(ROOT, p)) ? readFileSync(resolve(ROOT, p), 'utf-8') : '';

describe('AutoGradingService — Security Static Analysis', () => {
  it('auto-grading.service.ts exists', () => {
    expect(existsSync(resolve(ROOT, SERVICE_PATH))).toBe(true);
  });

  it('contains HTML sanitization logic (XSS prevention)', () => {
    const content = read(SERVICE_PATH);
    // Must contain a function named sanitize or a replace call that strips HTML tags
    expect(content).toMatch(/sanitize|replace\(.*<\[/);
  });

  it('uses JSON.stringify to build prompt payload (SI-3 injection prevention)', () => {
    const content = read(SERVICE_PATH);
    expect(content).toContain('JSON.stringify');
  });

  it('logger.log arguments do not reference studentAnswer or sanitizedAnswer (PII protection)', () => {
    const content = read(SERVICE_PATH);
    // Extract only the argument object on the same logical line as logger.log
    // by taking the text between { and } on the logger.log line
    const logCallIdx = content.indexOf('this.logger.log');
    expect(logCallIdx).toBeGreaterThan(-1);
    // Find the opening brace of the first argument object after logger.log
    const afterCall = content.slice(logCallIdx, logCallIdx + 200);
    const braceOpen = afterCall.indexOf('{');
    const braceClose = afterCall.indexOf('}');
    const logObject = afterCall.slice(braceOpen, braceClose + 1);
    // The log object must not reference student answer fields
    expect(logObject).not.toContain('studentAnswer');
    expect(logObject).not.toContain('sanitizedAnswer');
  });

  it('contains BadRequestException for input validation', () => {
    const content = read(SERVICE_PATH);
    expect(content).toContain('BadRequestException');
  });

  it('defines MAX_ANSWER_LENGTH constant (bounded input — memory safety)', () => {
    const content = read(SERVICE_PATH);
    // Must define a max length constant to prevent unbounded string allocation
    expect(content).toContain('MAX_ANSWER_LENGTH');
    expect(content).toMatch(/MAX_ANSWER_LENGTH\s*=\s*\d+/);
  });

  it('reads OLLAMA_URL from process.env (not hardcoded production URL)', () => {
    const content = read(SERVICE_PATH);
    expect(content).toContain('process.env.OLLAMA_URL');
    // Must have a fallback default (not rely solely on hardcoded value)
    expect(content).toContain('??');
  });
});
