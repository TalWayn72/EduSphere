import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

describe('On-premises security documentation', () => {
  describe('Security hardening checklist', () => {
    it('SECURITY_HARDENING.md exists', () => {
      expect(
        existsSync(resolve(ROOT, 'docs/deployment/SECURITY_HARDENING.md'))
      ).toBe(true);
    });

    it('covers network security: TLS for all inter-service comms', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/SECURITY_HARDENING.md'),
        'utf8'
      );
      expect(src.toLowerCase()).toContain('tls');
      expect(src.toLowerCase()).toContain('inter-service');
    });

    it('covers PostgreSQL TLS requirement (G-07)', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/SECURITY_HARDENING.md'),
        'utf8'
      );
      expect(src).toContain('sslmode=require');
    });

    it('covers Keycloak brute force protection (G-12)', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/SECURITY_HARDENING.md'),
        'utf8'
      );
      expect(src).toContain('bruteForceProtected');
    });

    it('covers pgAudit verification command', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/SECURITY_HARDENING.md'),
        'utf8'
      );
      expect(src).toContain('pgaudit');
    });

    it('covers rate limiting verification', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/SECURITY_HARDENING.md'),
        'utf8'
      );
      expect(src).toContain('429');
    });

    it('covers GDPR-specific checklist for EU deployments', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/SECURITY_HARDENING.md'),
        'utf8'
      );
      expect(src).toContain('GDPR');
      expect(src).toContain('eu-central-1');
    });

    it('includes internal CA setup for air-gapped deployments', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/SECURITY_HARDENING.md'),
        'utf8'
      );
      expect(src.toLowerCase()).toContain('step-ca');
    });

    it('covers read-only container filesystem requirement', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/SECURITY_HARDENING.md'),
        'utf8'
      );
      expect(src).toContain('readOnlyRootFilesystem');
    });

    it('covers Wazuh agent deployment requirement', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/SECURITY_HARDENING.md'),
        'utf8'
      );
      expect(src.toLowerCase()).toContain('wazuh');
    });
  });

  describe('Air-gapped installation guide', () => {
    it('AIR_GAPPED_INSTALL.md exists', () => {
      expect(
        existsSync(resolve(ROOT, 'docs/deployment/AIR_GAPPED_INSTALL.md'))
      ).toBe(true);
    });

    it('covers container image export procedure', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/AIR_GAPPED_INSTALL.md'),
        'utf8'
      );
      expect(src).toContain('docker save');
      expect(src).toContain('docker load');
    });

    it('covers checksum verification for supply chain security', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/AIR_GAPPED_INSTALL.md'),
        'utf8'
      );
      expect(src).toContain('sha256sum');
    });

    it('covers local LLM only mode for air-gapped AI', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/AIR_GAPPED_INSTALL.md'),
        'utf8'
      );
      expect(src).toContain('LOCAL_LLM_ONLY');
      expect(src).toContain('OLLAMA');
    });

    it('covers corporate proxy bypass configuration', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/AIR_GAPPED_INSTALL.md'),
        'utf8'
      );
      expect(src).toContain('NO_PROXY');
    });

    it('covers Keycloak offline realm import', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/AIR_GAPPED_INSTALL.md'),
        'utf8'
      );
      expect(src).toContain('import');
      expect(src.toLowerCase()).toContain('keycloak');
    });

    it('covers offline update procedure', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/AIR_GAPPED_INSTALL.md'),
        'utf8'
      );
      expect(src.toLowerCase()).toContain('update');
      expect(src).toContain('helm upgrade');
    });

    it('covers NODE_EXTRA_CA_CERTS for internal CA trust', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/AIR_GAPPED_INSTALL.md'),
        'utf8'
      );
      expect(src).toContain('NODE_EXTRA_CA_CERTS');
    });
  });
});
