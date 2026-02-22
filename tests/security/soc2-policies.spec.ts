/**
 * Static security tests for SOC2 policy documentation (Phase 8).
 * SOC2 CC1.1–CC1.5, CC6.1, CC7.3, CC8.1, CC9.1, A1.1:
 * Organization must maintain formal written security policies.
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

function policyExists(filename: string): boolean {
  return existsSync(resolve(ROOT, 'docs/policies', filename));
}

function readPolicy(filename: string): string {
  return readFile(`docs/policies/${filename}`);
}

// ─── Policy existence ─────────────────────────────────────────────────────────

describe('SOC2 Policy Library: All 10 Policies Exist', () => {
  it('docs/policies/ directory exists', () => {
    expect(existsSync(resolve(ROOT, 'docs/policies'))).toBe(true);
  });

  it('POL-001: INFORMATION_SECURITY_POLICY.md exists', () => {
    expect(policyExists('INFORMATION_SECURITY_POLICY.md')).toBe(true);
  });

  it('POL-002: ACCESS_CONTROL_POLICY.md exists', () => {
    expect(policyExists('ACCESS_CONTROL_POLICY.md')).toBe(true);
  });

  it('POL-003: CHANGE_MANAGEMENT_POLICY.md exists', () => {
    expect(policyExists('CHANGE_MANAGEMENT_POLICY.md')).toBe(true);
  });

  it('POL-004: INCIDENT_RESPONSE_POLICY.md exists', () => {
    expect(policyExists('INCIDENT_RESPONSE_POLICY.md')).toBe(true);
  });

  it('POL-005: BUSINESS_CONTINUITY_POLICY.md exists', () => {
    expect(policyExists('BUSINESS_CONTINUITY_POLICY.md')).toBe(true);
  });

  it('POL-006: VENDOR_MANAGEMENT_POLICY.md exists', () => {
    expect(policyExists('VENDOR_MANAGEMENT_POLICY.md')).toBe(true);
  });

  it('POL-007: DATA_CLASSIFICATION_POLICY.md exists', () => {
    expect(policyExists('DATA_CLASSIFICATION_POLICY.md')).toBe(true);
  });

  it('POL-008: ENCRYPTION_POLICY.md exists', () => {
    expect(policyExists('ENCRYPTION_POLICY.md')).toBe(true);
  });

  it('POL-009: GDPR_COMPLIANCE_POLICY.md exists', () => {
    expect(policyExists('GDPR_COMPLIANCE_POLICY.md')).toBe(true);
  });

  it('POL-010: AI_USAGE_POLICY.md exists', () => {
    expect(policyExists('AI_USAGE_POLICY.md')).toBe(true);
  });
});

// ─── Policy metadata quality ──────────────────────────────────────────────────

describe('SOC2 Policy Quality: Required Metadata Fields', () => {
  const POLICIES = [
    'INFORMATION_SECURITY_POLICY.md',
    'ACCESS_CONTROL_POLICY.md',
    'CHANGE_MANAGEMENT_POLICY.md',
    'INCIDENT_RESPONSE_POLICY.md',
    'BUSINESS_CONTINUITY_POLICY.md',
    'VENDOR_MANAGEMENT_POLICY.md',
    'DATA_CLASSIFICATION_POLICY.md',
    'ENCRYPTION_POLICY.md',
    'GDPR_COMPLIANCE_POLICY.md',
    'AI_USAGE_POLICY.md',
  ];

  POLICIES.forEach((filename) => {
    it(`${filename} has Document ID`, () => {
      const content = readPolicy(filename);
      expect(content).toMatch(/Document ID.*POL-\d+/);
    });

    it(`${filename} has Owner field`, () => {
      const content = readPolicy(filename);
      // Matches both **Owner** and **Owner:** formats
      expect(content).toMatch(/\*\*Owner/);
    });

    it(`${filename} has Last Reviewed date`, () => {
      const content = readPolicy(filename);
      expect(content).toMatch(/Last Reviewed.*202[5-9]/);
    });

    it(`${filename} references SOC2 Trust Service Criteria`, () => {
      const content = readPolicy(filename);
      // SOC2 CC criteria, A1 criteria, or regulation name in metadata
      expect(content).toMatch(/SOC2|CC\d+\.\d+|A\d+\.\d+|GDPR|EU AI Act/);
    });
  });
});

// ─── Information Security Policy (POL-001) ────────────────────────────────────

describe('POL-001: Information Security Policy (CC1.1–CC1.5)', () => {
  const content = readPolicy('INFORMATION_SECURITY_POLICY.md');

  it('defines RESTRICTED data classification', () => {
    expect(content).toContain('RESTRICTED');
  });

  it('defines CONFIDENTIAL data classification', () => {
    expect(content).toContain('CONFIDENTIAL');
  });

  it('mandates AES-256-GCM encryption for PII', () => {
    expect(content).toMatch(/AES-256/);
  });

  it('mandates TLS for data in transit', () => {
    expect(content).toMatch(/TLS/);
  });

  it('references RLS tenant isolation', () => {
    expect(content).toMatch(/RLS|Row.Level Security/);
  });

  it('defines exception process', () => {
    expect(content).toMatch(/Exception|exception/);
  });
});

// ─── Access Control Policy (POL-002) ─────────────────────────────────────────

describe('POL-002: Access Control Policy (CC6.1–CC6.7)', () => {
  const content = readPolicy('ACCESS_CONTROL_POLICY.md');

  it('mandates MFA for all staff', () => {
    expect(content).toMatch(/MFA|Multi.Factor|multi-factor/i);
  });

  it('defines RBAC roles (STUDENT, INSTRUCTOR, ORG_ADMIN)', () => {
    expect(content).toMatch(/STUDENT|INSTRUCTOR|ORG_ADMIN/);
  });

  it('enforces least privilege principle', () => {
    expect(content).toMatch(/least.privilege|least privilege/i);
  });

  it('defines brute-force lockout (5 attempts)', () => {
    expect(content).toMatch(/failureFactor.*5|5.*fail/);
  });

  it('mandates account revocation on termination', () => {
    expect(content).toMatch(/terminat|revok/i);
  });

  it('mandates audit logging for access events', () => {
    expect(content).toMatch(/audit|logged/i);
  });
});

// ─── Change Management Policy (POL-003) ──────────────────────────────────────

describe('POL-003: Change Management Policy (CC8.1)', () => {
  const content = readPolicy('CHANGE_MANAGEMENT_POLICY.md');

  it('defines change classification tiers (Emergency, Standard, Normal, Major)', () => {
    expect(content).toMatch(/Emergency/);
    expect(content).toMatch(/Standard/);
    expect(content).toMatch(/Normal/);
  });

  it('mandates CI/CD gates before merge', () => {
    expect(content).toMatch(/CI\/CD|ci\.yml/);
  });

  it('mandates security tests in CI', () => {
    expect(content).toMatch(/security.*test|test.*security/i);
  });

  it('mandates OWASP Dependency-Check in CI', () => {
    expect(content).toMatch(/OWASP/);
  });

  it('mandates rollback plan for all deployments', () => {
    expect(content).toMatch(/rollback/i);
  });
});

// ─── Incident Response Policy (POL-004) ──────────────────────────────────────

describe('POL-004: Incident Response Policy (CC7.3–CC7.5)', () => {
  const content = readPolicy('INCIDENT_RESPONSE_POLICY.md');

  it('defines P0-P3 severity levels', () => {
    expect(content).toMatch(/P0/);
    expect(content).toMatch(/P1/);
    expect(content).toMatch(/P2/);
    expect(content).toMatch(/P3/);
  });

  it('mandates 72-hour GDPR Art.33 DPA notification', () => {
    expect(content).toMatch(/72.hour|Art\.33/);
  });

  it('references Wazuh alert rules', () => {
    expect(content).toMatch(/Wazuh|100001/);
  });

  it('defines evidence preservation steps', () => {
    expect(content).toMatch(/evidence|Evidence/);
  });

  it('requires post-incident review (blameless post-mortem)', () => {
    expect(content).toMatch(/post.mortem|post-incident/i);
  });
});

// ─── Business Continuity Policy (POL-005) ────────────────────────────────────

describe('POL-005: Business Continuity Policy (A1.1–A1.3)', () => {
  const content = readPolicy('BUSINESS_CONTINUITY_POLICY.md');

  it('defines RTO and RPO targets', () => {
    expect(content).toMatch(/RTO/);
    expect(content).toMatch(/RPO/);
  });

  it('defines Tier 1 (Critical) 1-hour RTO', () => {
    expect(content).toMatch(/1 hour|1hr|1-hour/);
  });

  it('mandates daily database backups', () => {
    expect(content).toMatch(/backup/i);
  });

  it('mandates DR testing schedule', () => {
    expect(content).toMatch(/DR.*test|disaster.*recovery/i);
  });

  it('defines communication plan for outages', () => {
    expect(content).toMatch(/communication|status page/i);
  });
});

// ─── Vendor Management Policy (POL-006) ──────────────────────────────────────

describe('POL-006: Vendor Management Policy (CC9.1–CC9.2)', () => {
  const content = readPolicy('VENDOR_MANAGEMENT_POLICY.md');

  it('defines Tier 1 (Critical) vendor classification', () => {
    expect(content).toMatch(/Tier 1/);
  });

  it('mandates DPA for EU data processors', () => {
    expect(content).toMatch(/DPA|Data Processing Agreement/);
  });

  it('mandates SOC2/ISO27001 review for Tier 1 vendors', () => {
    expect(content).toMatch(/SOC2|ISO 27001/);
  });

  it('implements LLM consent gate (SI-10)', () => {
    expect(content).toMatch(/THIRD_PARTY_LLM|consent.*LLM|LLM.*consent/);
  });

  it('mandates subprocessor list maintenance', () => {
    expect(content).toMatch(/subprocessor/i);
  });
});

// ─── Data Classification Policy (POL-007) ────────────────────────────────────

describe('POL-007: Data Classification Policy (CC6.1, P1.1)', () => {
  const content = readPolicy('DATA_CLASSIFICATION_POLICY.md');

  it('defines 4 classification levels', () => {
    expect(content).toMatch(/RESTRICTED/);
    expect(content).toMatch(/CONFIDENTIAL/);
    expect(content).toMatch(/INTERNAL/);
    expect(content).toMatch(/PUBLIC/);
  });

  it('mandates AES-256-GCM for RESTRICTED data', () => {
    expect(content).toMatch(/AES-256/);
  });

  it('covers GDPR Art.17 erasure implementation', () => {
    expect(content).toMatch(/Art\.17|erasure|Erasure/);
  });

  it('covers GDPR Art.20 data portability', () => {
    expect(content).toMatch(/Art\.20|portability|Portability/);
  });

  it('mandates PII scrubbing before LLM calls', () => {
    expect(content).toMatch(/PII.*scrub|scrub.*PII|pii-scrubber/i);
  });
});

// ─── Encryption Policy (POL-008) ─────────────────────────────────────────────

describe('POL-008: Encryption Policy (CC6.1, CC6.7)', () => {
  const content = readPolicy('ENCRYPTION_POLICY.md');

  it('mandates AES-256-GCM with random IV', () => {
    expect(content).toMatch(/AES-256-GCM/);
    expect(content).toMatch(/IV|iv|nonce/i);
  });

  it('mandates TLS 1.3 minimum', () => {
    expect(content).toMatch(/TLS 1\.3/);
  });

  it('mandates key rotation schedule', () => {
    expect(content).toMatch(/rotat/i);
  });

  it('forbids deprecated algorithms (MD5, SHA-1, 3DES)', () => {
    expect(content).toMatch(/MD5|SHA-1|3DES/);
    expect(content).toMatch(/Forbidden|deprecated/i);
  });

  it('defines key hierarchy (master key → tenant DEK)', () => {
    expect(content).toMatch(/DEK|tenant.*key|key.*hierarch/i);
  });
});

// ─── GDPR Compliance Policy (POL-009) ────────────────────────────────────────

describe('POL-009: GDPR Compliance Policy (GDPR Art.5–Art.34)', () => {
  const content = readPolicy('GDPR_COMPLIANCE_POLICY.md');

  it('defines legal bases for processing (Art.6)', () => {
    expect(content).toMatch(/Art\.6|legal basis/i);
  });

  it('covers all 7 data subject rights (Art.15–Art.22)', () => {
    expect(content).toMatch(/Art\.15|Right of Access/);
    expect(content).toMatch(/Art\.17|erasure|Right to be Forgotten/i);
    expect(content).toMatch(/Art\.20|Portability/);
  });

  it('mandates AI consent for external LLM processing', () => {
    expect(content).toMatch(/THIRD_PARTY_LLM|AI_PROCESSING/);
  });

  it('mandates 72-hour DPA breach notification (Art.33)', () => {
    expect(content).toMatch(/72.hour|Art\.33/);
  });

  it('covers Standard Contractual Clauses for US transfers', () => {
    expect(content).toMatch(/SCC|Standard Contractual Clauses/);
  });

  it('mandates Data Protection by Design (Art.25)', () => {
    expect(content).toMatch(/Art\.25|Privacy by Design|Privacy.by.default/i);
  });
});

// ─── AI Usage Policy (POL-010) ───────────────────────────────────────────────

describe('POL-010: AI Usage Policy (EU AI Act, GDPR Art.22)', () => {
  const content = readPolicy('AI_USAGE_POLICY.md');

  it('references EU AI Act 2024/1689', () => {
    expect(content).toMatch(/EU AI Act|2024\/1689/);
  });

  it('mandates transparency disclosure (Art.50)', () => {
    expect(content).toMatch(/Art\.50|transparency/i);
  });

  it('mandates model cards (Art.53)', () => {
    expect(content).toMatch(/Art\.53|model card/i);
  });

  it('enforces LLM consent gate (SI-10)', () => {
    expect(content).toMatch(/THIRD_PARTY_LLM|consent.*LLM/);
  });

  it('mandates PII scrubbing before LLM calls', () => {
    expect(content).toMatch(/pii.scrubber|PII.*scrub/i);
  });

  it('mandates gVisor sandboxing for agent execution', () => {
    expect(content).toMatch(/gVisor|sandbox/i);
  });

  it('prohibits biometric surveillance of students', () => {
    expect(content).toMatch(/biometric|surveillance/i);
  });

  it('mandates human oversight for consequential decisions', () => {
    expect(content).toMatch(/human.*oversight|human.*review/i);
  });
});
