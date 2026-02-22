/**
 * Static security tests for GDPR records documentation.
 * GDPR Art.30: Records of Processing Activities (RoPA).
 * GDPR Art.35: Data Protection Impact Assessment (DPIA).
 * No DB/network required — pure static file analysis.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

function readFile(relativePath: string): string {
  const fullPath = resolve(ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

describe('PROCESSING_ACTIVITIES.md — GDPR Art.30 RoPA', () => {
  const content = readFile('docs/security/PROCESSING_ACTIVITIES.md');

  it('docs/security/PROCESSING_ACTIVITIES.md exists', () => {
    expect(existsSync(resolve(ROOT, 'docs/security/PROCESSING_ACTIVITIES.md'))).toBe(true);
  });

  it('covers user account management activity (RPA-001)', () => {
    expect(content).toMatch(/RPA-001|User Account/);
  });

  it('covers security audit logging activity (RPA-002)', () => {
    expect(content).toMatch(/RPA-002|audit.*log|security.*monitor/i);
  });

  it('covers AI processing activity with consent gate (RPA-005)', () => {
    expect(content).toMatch(/RPA-005|AI.*Consent|AI_PROCESSING/);
  });

  it('covers personal annotations activity (RPA-006)', () => {
    expect(content).toMatch(/RPA-006|Annotation/);
  });

  it('specifies legal basis for each activity', () => {
    expect(content).toMatch(/Art\.6\(1\)\(b\)|Legal Basis/);
  });

  it('specifies retention periods for each activity', () => {
    expect(content).toMatch(/Retention/);
  });

  it('identifies subprocessors for each activity', () => {
    expect(content).toMatch(/Sub.processor|subprocessor/i);
  });

  it('notes US transfer with SCCs for AI providers', () => {
    expect(content).toMatch(/SCC|Standard Contractual|US.*consent|consent.*US/i);
  });

  it('distinguishes EduSphere as controller vs processor roles', () => {
    expect(content).toMatch(/Data Controller|Data Processor/i);
  });

  it('references GDPR Art.30', () => {
    expect(content).toMatch(/Art\.30/);
  });

  it('includes review schedule', () => {
    expect(content).toMatch(/Review|DPO/);
  });
});

describe('DPIA_TEMPLATE.md — GDPR Art.35 Data Protection Impact Assessment', () => {
  const content = readFile('docs/security/DPIA_TEMPLATE.md');

  it('docs/security/DPIA_TEMPLATE.md exists', () => {
    expect(existsSync(resolve(ROOT, 'docs/security/DPIA_TEMPLATE.md'))).toBe(true);
  });

  it('references GDPR Art.35', () => {
    expect(content).toMatch(/Art\.35/);
  });

  it('defines when DPIA is mandatory', () => {
    expect(content).toMatch(/mandatory|required|When a DPIA/i);
  });

  it('includes risk identification matrix (likelihood × impact)', () => {
    expect(content).toMatch(/Likelihood|Impact|Risk Score/i);
  });

  it('includes cross-tenant data leak as a risk', () => {
    expect(content).toMatch(/Cross.tenant|cross-tenant/i);
  });

  it('includes AI bias or discrimination as a risk', () => {
    expect(content).toMatch(/AI bias|bias/i);
  });

  it('includes security measures checklist with AES-256-GCM', () => {
    expect(content).toMatch(/AES-256/);
  });

  it('includes RLS (tenant isolation) in security measures', () => {
    expect(content).toMatch(/RLS/);
  });

  it('includes PII scrubbing for AI calls', () => {
    expect(content).toMatch(/PII scrubb|PII.*scrubb/i);
  });

  it('includes DPO approval section', () => {
    expect(content).toMatch(/DPO Opinion|DPO.*sign|DPO.*review/i);
  });

  it('references supervisory authority consultation (Art.36)', () => {
    expect(content).toMatch(/Art\.36|supervisory authority/i);
  });

  it('includes DPIA completion checklist', () => {
    expect(content).toMatch(/Checklist|checklist/i);
  });

  it('requires records of processing to be updated', () => {
    expect(content).toMatch(/PROCESSING_ACTIVITIES/);
  });
});
