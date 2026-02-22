/**
 * Static security tests for vendor compliance documentation.
 * SOC2 CC9.1–CC9.2: Vendor risk management.
 * GDPR Art.28: Subprocessor list and DPAs.
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

describe('SUBPROCESSORS.md — GDPR Art.28 Subprocessor List', () => {
  const content = readFile('docs/security/SUBPROCESSORS.md');

  it('docs/security/SUBPROCESSORS.md exists', () => {
    expect(existsSync(resolve(ROOT, 'docs/security/SUBPROCESSORS.md'))).toBe(true);
  });

  it('has 30-day advance notice obligation', () => {
    expect(content).toMatch(/30.day/i);
  });

  it('lists AWS as cloud infrastructure subprocessor', () => {
    expect(content).toMatch(/Amazon Web Services|AWS/);
  });

  it('lists OpenAI as AI subprocessor (consent-gated)', () => {
    expect(content).toMatch(/OpenAI/);
    expect(content).toMatch(/THIRD_PARTY_LLM|consent/i);
  });

  it('lists Anthropic as AI subprocessor (consent-gated)', () => {
    expect(content).toMatch(/Anthropic/);
  });

  it('specifies EU data residency for infrastructure', () => {
    expect(content).toMatch(/eu-central-1|eu-west-1|EU/);
  });

  it('references SCCs for US data transfers', () => {
    expect(content).toMatch(/SCC|Standard Contractual/);
  });

  it('lists GitHub for CI/CD', () => {
    expect(content).toMatch(/GitHub/);
  });

  it('confirms DPA status for Tier 1 subprocessors', () => {
    expect(content).toMatch(/DPA.*Signed|✅.*DPA|DPA.*✅/);
  });

  it('mentions PII scrubbing before AI provider transmission', () => {
    expect(content).toMatch(/PII.scrubb|scrubbed|scrub/i);
  });

  it('references on-premises air-gapped option', () => {
    expect(content).toMatch(/air.gap|on.prem/i);
  });
});

describe('VENDOR_REGISTER.md — SOC2 CC9.1 Vendor Risk Register', () => {
  const content = readFile('docs/security/VENDOR_REGISTER.md');

  it('docs/security/VENDOR_REGISTER.md exists', () => {
    expect(existsSync(resolve(ROOT, 'docs/security/VENDOR_REGISTER.md'))).toBe(true);
  });

  it('defines Tier 1, Tier 2, Tier 3 vendor classification', () => {
    expect(content).toMatch(/Tier 1/);
    expect(content).toMatch(/Tier 2/);
    expect(content).toMatch(/Tier 3/);
  });

  it('tracks SOC2 Type II status for Tier 1 vendors', () => {
    expect(content).toMatch(/SOC2 Type II/);
  });

  it('tracks DPA status for all vendors', () => {
    expect(content).toMatch(/DPA/);
  });

  it('tracks review dates (Last Review + Next Review)', () => {
    expect(content).toMatch(/Last Review/);
    expect(content).toMatch(/Next Review/);
  });

  it('lists AWS as Tier 1 approved', () => {
    expect(content).toMatch(/Amazon Web Services|AWS/);
  });

  it('lists OpenAI as Tier 1 approved', () => {
    expect(content).toMatch(/OpenAI/);
  });

  it('includes vendor offboarding process', () => {
    expect(content).toMatch(/Offboard|offboard/i);
  });

  it('documents self-hosted components separately from vendors', () => {
    expect(content).toMatch(/Self.Hosted|self-hosted/i);
  });

  it('references VENDOR_MANAGEMENT_POLICY.md', () => {
    expect(content).toMatch(/VENDOR_MANAGEMENT_POLICY|POL-006/);
  });

  it('includes security assessment checklist for Tier 1', () => {
    expect(content).toMatch(/Security Assessment Checklist|checklist/i);
  });
});
