import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Navigate from tests/security/ up to the project root
const ROOT = resolve(import.meta.dirname, '../..');

describe('Incident response controls (G-18)', () => {
  describe('Incident response procedure document', () => {
    it('INCIDENT_RESPONSE.md exists', () => {
      expect(
        existsSync(resolve(ROOT, 'docs/security/INCIDENT_RESPONSE.md'))
      ).toBe(true);
    });

    it('defines 72-hour GDPR Art.33 notification requirement', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/security/INCIDENT_RESPONSE.md'),
        'utf8'
      );
      expect(src).toContain('72');
      expect(src).toContain('Art.33');
    });

    it('classifies severity levels P0 through P3', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/security/INCIDENT_RESPONSE.md'),
        'utf8'
      );
      expect(src).toContain('P0');
      expect(src).toContain('P1');
      expect(src).toContain('P2');
      expect(src).toContain('P3');
    });

    it('defines evidence preservation procedure', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/security/INCIDENT_RESPONSE.md'),
        'utf8'
      );
      expect(src.toLowerCase()).toContain('evidence');
      expect(src.toLowerCase()).toContain('preserve');
    });

    it('lists supervisory authorities by EU region', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/security/INCIDENT_RESPONSE.md'),
        'utf8'
      );
      // At least one EU DPA listed
      const hasDPA =
        src.includes('BfDI') ||
        src.includes('CNIL') ||
        src.includes('DPC') ||
        src.includes('supervisory');
      expect(hasDPA).toBe(true);
    });

    it('defines 7-year evidence retention for SOC2 CC7.4', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/security/INCIDENT_RESPONSE.md'),
        'utf8'
      );
      expect(src).toContain('7 year');
    });

    it('covers GDPR Art.34 high-risk user notification', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/security/INCIDENT_RESPONSE.md'),
        'utf8'
      );
      expect(src).toContain('Art.34');
    });
  });

  describe('Wazuh breach detection rules', () => {
    it('Wazuh rules file exists', () => {
      expect(
        existsSync(
          resolve(ROOT, 'infrastructure/wazuh/rules/edusphere-breach.xml')
        )
      ).toBe(true);
    });

    it('rule 100001 detects cross-tenant RLS violations (level 15 — critical)', () => {
      const src = readFileSync(
        resolve(ROOT, 'infrastructure/wazuh/rules/edusphere-breach.xml'),
        'utf8'
      );
      expect(src).toContain('100001');
      expect(src).toContain('level="15"');
      expect(src).toContain('cross.tenant');
    });

    it('rule 100002 detects mass data export for exfiltration detection', () => {
      const src = readFileSync(
        resolve(ROOT, 'infrastructure/wazuh/rules/edusphere-breach.xml'),
        'utf8'
      );
      expect(src).toContain('100002');
      expect(src).toContain('DATA_EXPORT');
    });

    it('rule 100003 detects authentication brute force attacks', () => {
      const src = readFileSync(
        resolve(ROOT, 'infrastructure/wazuh/rules/edusphere-breach.xml'),
        'utf8'
      );
      expect(src).toContain('100003');
      expect(src).toContain('brute_force');
    });

    it('rules include MITRE ATT&CK framework references for SOC2 CC7.2', () => {
      const src = readFileSync(
        resolve(ROOT, 'infrastructure/wazuh/rules/edusphere-breach.xml'),
        'utf8'
      );
      expect(src).toContain('<mitre>');
    });

    it('rule 100007 detects unauthorized SUPER_ADMIN creation', () => {
      const src = readFileSync(
        resolve(ROOT, 'infrastructure/wazuh/rules/edusphere-breach.xml'),
        'utf8'
      );
      expect(src).toContain('100007');
      expect(src).toContain('SUPER_ADMIN');
    });
  });

  describe('Falco runtime detection rules', () => {
    it('Falco rules file exists', () => {
      expect(
        existsSync(resolve(ROOT, 'infrastructure/falco/edusphere-rules.yaml'))
      ).toBe(true);
    });

    it('detects psql direct access bypassing ORM and RLS', () => {
      const src = readFileSync(
        resolve(ROOT, 'infrastructure/falco/edusphere-rules.yaml'),
        'utf8'
      );
      expect(src).toContain('psql');
      expect(src).toContain('rls_bypass');
    });

    it('detects unexpected outbound connections from agent container', () => {
      const src = readFileSync(
        resolve(ROOT, 'infrastructure/falco/edusphere-rules.yaml'),
        'utf8'
      );
      expect(src).toContain('subgraph-agent');
      expect(src).toContain('outbound');
    });

    it('tags EU AI Act compliance in agent outbound rule', () => {
      const src = readFileSync(
        resolve(ROOT, 'infrastructure/falco/edusphere-rules.yaml'),
        'utf8'
      );
      expect(src).toContain('eu_ai_act');
    });

    it('detects shell spawning in production containers', () => {
      const src = readFileSync(
        resolve(ROOT, 'infrastructure/falco/edusphere-rules.yaml'),
        'utf8'
      );
      expect(src).toContain('shell');
      expect(src).toContain('container_security');
    });
  });
});
