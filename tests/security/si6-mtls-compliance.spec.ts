/**
 * Security Test: SI-6 — Inter-Service mTLS Compliance
 *
 * Validates that:
 * 1. Production/staging Helm values enforce HTTPS subgraph URLs (not HTTP)
 * 2. Docker Compose mTLS overlay exists and configures HTTPS
 * 3. Certificate generation script exists
 * 4. Gateway .env.example documents both HTTP (dev) and HTTPS (staging/prod)
 * 5. Linkerd mTLS infrastructure is in place for production
 *
 * No running services required — static file validation only.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(join(import.meta.dirname, '../..'));

function readFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf-8');
}

// ─── mTLS Infrastructure Files ──────────────────────────────────────────────

describe('SI-6: mTLS infrastructure files exist', () => {
  it('generate-certs.sh script exists', () => {
    expect(existsSync(join(ROOT, 'infrastructure/mtls/generate-certs.sh'))).toBe(true);
  });

  it('mTLS README.md exists', () => {
    expect(existsSync(join(ROOT, 'infrastructure/mtls/README.md'))).toBe(true);
  });

  it('docker-compose.mtls.yml overlay exists', () => {
    expect(existsSync(join(ROOT, 'docker-compose.mtls.yml'))).toBe(true);
  });

  it('certs directory has .gitignore (never commit keys)', () => {
    expect(existsSync(join(ROOT, 'infrastructure/mtls/certs/.gitignore'))).toBe(true);
  });

  it('Linkerd manifests exist for production mTLS', () => {
    expect(existsSync(join(ROOT, 'infrastructure/k8s/linkerd/server-policies.yaml'))).toBe(true);
    expect(existsSync(join(ROOT, 'infrastructure/k8s/linkerd/mtls-test.yaml'))).toBe(true);
    expect(existsSync(join(ROOT, 'infrastructure/k8s/linkerd/namespace-annotations.yaml'))).toBe(true);
  });
});

// ─── Certificate Generation Script ─────────────────────────────────────────

describe('SI-6: generate-certs.sh covers all services', () => {
  let script: string;

  beforeAll(() => {
    script = readFile('infrastructure/mtls/generate-certs.sh');
  });

  const SERVICES = [
    'gateway',
    'subgraph-core',
    'subgraph-content',
    'subgraph-annotation',
    'subgraph-collaboration',
    'subgraph-agent',
    'subgraph-knowledge',
  ];

  it.each(SERVICES)('includes %s in the service list', (service) => {
    expect(script).toContain(`"${service}"`);
  });

  it('generates a CA certificate', () => {
    expect(script).toContain('ca.crt');
    expect(script).toContain('ca.key');
  });

  it('uses Subject Alternative Names (SAN)', () => {
    expect(script).toContain('subjectAltName');
  });

  it('includes cluster DNS names in SAN', () => {
    expect(script).toContain('.edusphere.svc.cluster.local');
  });
});

// ─── Docker Compose mTLS Overlay ────────────────────────────────────────────

describe('SI-6: docker-compose.mtls.yml configures HTTPS', () => {
  let content: string;

  beforeAll(() => {
    content = readFile('docker-compose.mtls.yml');
  });

  it('sets MTLS_ENABLED=true', () => {
    expect(content).toContain('MTLS_ENABLED');
    expect(content).toContain('"true"');
  });

  it('sets NODE_EXTRA_CA_CERTS for Node.js CA trust', () => {
    expect(content).toContain('NODE_EXTRA_CA_CERTS');
  });

  it('configures SUBGRAPH_CORE_URL as https://', () => {
    expect(content).toMatch(/SUBGRAPH_CORE_URL:\s*https:\/\//);
  });

  it('configures SUBGRAPH_CONTENT_URL as https://', () => {
    expect(content).toMatch(/SUBGRAPH_CONTENT_URL:\s*https:\/\//);
  });

  it('configures SUBGRAPH_ANNOTATION_URL as https://', () => {
    expect(content).toMatch(/SUBGRAPH_ANNOTATION_URL:\s*https:\/\//);
  });

  it('configures SUBGRAPH_COLLABORATION_URL as https://', () => {
    expect(content).toMatch(/SUBGRAPH_COLLABORATION_URL:\s*https:\/\//);
  });

  it('configures SUBGRAPH_AGENT_URL as https://', () => {
    expect(content).toMatch(/SUBGRAPH_AGENT_URL:\s*https:\/\//);
  });

  it('configures SUBGRAPH_KNOWLEDGE_URL as https://', () => {
    expect(content).toMatch(/SUBGRAPH_KNOWLEDGE_URL:\s*https:\/\//);
  });

  it('mounts CA cert into gateway container', () => {
    expect(content).toContain('ca.crt:/etc/edusphere/tls/ca.crt');
  });

  it('mounts service certs into subgraph containers', () => {
    expect(content).toContain('subgraph-core/tls.crt');
    expect(content).toContain('subgraph-content/tls.crt');
    expect(content).toContain('subgraph-annotation/tls.crt');
    expect(content).toContain('subgraph-collaboration/tls.crt');
    expect(content).toContain('subgraph-agent/tls.crt');
    expect(content).toContain('subgraph-knowledge/tls.crt');
  });

  it('does NOT contain plain http:// subgraph URLs (excluding comments)', () => {
    // The overlay should only have https:// for subgraph URL assignments
    const subgraphUrlLines = content
      .split('\n')
      .filter((line) => line.match(/SUBGRAPH_.*_URL/) && !line.trimStart().startsWith('#'));
    for (const line of subgraphUrlLines) {
      expect(line).not.toMatch(/http:\/\//);
    }
  });
});

// ─── Helm Values — Production/Staging enforce mTLS ──────────────────────────

describe('SI-6: Helm values enforce mTLS in non-dev environments', () => {
  it('values.staging.yaml has mtls.enabled: true', () => {
    const staging = readFile('infrastructure/k8s/helm/edusphere/values.staging.yaml');
    expect(staging).toMatch(/mtls:\s*\n\s*enabled:\s*true/);
  });

  it('values.production.yaml has mtls.enabled: true', () => {
    const production = readFile('infrastructure/k8s/helm/edusphere/values.production.yaml');
    expect(production).toMatch(/mtls:\s*\n\s*enabled:\s*true/);
  });

  it('values.yaml (default) has mtls.enabled: false', () => {
    const defaults = readFile('infrastructure/k8s/helm/edusphere/values.yaml');
    expect(defaults).toMatch(/mtls:\s*\n\s*enabled:\s*false/);
  });
});

// ─── Helm Templates — Protocol switches based on mtls.enabled ───────────────

describe('SI-6: Helm templates support https:// when mtls.enabled', () => {
  it('subgraph-urls configmap template uses protocol variable', () => {
    const template = readFile(
      'infrastructure/k8s/helm/edusphere/templates/configmaps/subgraph-urls.yaml',
    );
    expect(template).toContain('$protocol');
    expect(template).toContain('.Values.mtls');
  });

  it('gateway deployment template uses protocol variable', () => {
    const template = readFile(
      'infrastructure/k8s/helm/edusphere/templates/gateway/deployment.yaml',
    );
    expect(template).toContain('$protocol');
    expect(template).toContain('.Values.mtls');
  });
});

// ─── Gateway .env.example — Documents both modes ────────────────────────────

describe('SI-6: Gateway .env.example documents mTLS URLs', () => {
  let envExample: string;

  beforeAll(() => {
    envExample = readFile('apps/gateway/.env.example');
  });

  it('documents HTTP URLs for development', () => {
    expect(envExample).toContain('http://localhost:4001/graphql');
  });

  it('documents HTTPS URLs for staging/production', () => {
    expect(envExample).toContain('https://subgraph-core:4001/graphql');
  });

  it('mentions SI-6 in the comments', () => {
    expect(envExample).toContain('SI-6');
  });
});

// ─── Development mode stays on HTTP (no false positives) ────────────────────

describe('SI-6: Development docker-compose.dev.yml uses plain HTTP', () => {
  let devCompose: string;

  beforeAll(() => {
    devCompose = readFile('docker-compose.dev.yml');
  });

  it('gateway connects to subgraphs via http:// in dev', () => {
    expect(devCompose).toContain('SUBGRAPH_CORE_URL=http://subgraph-core:4001/graphql');
  });

  it('does NOT use https:// in dev compose (no accidental mTLS)', () => {
    const subgraphUrlLines = devCompose
      .split('\n')
      .filter((line) => line.match(/SUBGRAPH_.*_URL/));
    for (const line of subgraphUrlLines) {
      expect(line).not.toMatch(/https:\/\//);
    }
  });
});

// ─── README Documentation ───────────────────────────────────────────────────

describe('SI-6: mTLS README covers required topics', () => {
  let readme: string;

  beforeAll(() => {
    readme = readFile('infrastructure/mtls/README.md');
  });

  it('explains Linkerd as preferred production solution', () => {
    expect(readme).toContain('Linkerd');
    expect(readme).toContain('production');
  });

  it('documents certificate rotation', () => {
    expect(readme).toContain('rotation');
    expect(readme).toContain('Rotation');
  });

  it('documents mTLS verification with openssl s_client', () => {
    expect(readme).toContain('openssl s_client');
  });

  it('documents environment variables for cert paths', () => {
    expect(readme).toContain('MTLS_CERT_PATH');
    expect(readme).toContain('MTLS_KEY_PATH');
    expect(readme).toContain('MTLS_CA_PATH');
  });

  it('includes architecture diagram', () => {
    expect(readme).toContain('```mermaid');
  });
});
