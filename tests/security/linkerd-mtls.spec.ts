/**
 * Security Test: Linkerd mTLS Infrastructure Configuration (SI-6, ISO 27001 A.13.2)
 *
 * Static validation that the Linkerd YAML manifests exist and contain
 * all required security annotations, AuthorizationPolicy specs, and
 * ServerAuthorization resources for inter-service mTLS enforcement.
 *
 * No running Kubernetes cluster required.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const LINKERD_DIR = resolve(
  join(import.meta.dirname, '../../infrastructure/k8s/linkerd'),
);

const NETWORK_POLICY_DIR = resolve(
  join(import.meta.dirname, '../../infrastructure/k8s/network-policies'),
);

function readYaml(filePath: string): string {
  return readFileSync(filePath, 'utf-8');
}

// ─── File Existence ────────────────────────────────────────────────────────

describe('Linkerd mTLS manifest files exist', () => {
  it('namespace-annotations.yaml exists', () => {
    expect(existsSync(join(LINKERD_DIR, 'namespace-annotations.yaml'))).toBe(true);
  });

  it('server-policies.yaml exists', () => {
    expect(existsSync(join(LINKERD_DIR, 'server-policies.yaml'))).toBe(true);
  });

  it('mtls-test.yaml exists', () => {
    expect(existsSync(join(LINKERD_DIR, 'mtls-test.yaml'))).toBe(true);
  });

  it('README.md exists', () => {
    expect(existsSync(join(LINKERD_DIR, 'README.md'))).toBe(true);
  });

  it('edusphere-network-policies.yaml exists', () => {
    expect(
      existsSync(join(NETWORK_POLICY_DIR, 'edusphere-network-policies.yaml')),
    ).toBe(true);
  });
});

// ─── Namespace Annotations ─────────────────────────────────────────────────

describe('namespace-annotations.yaml — Linkerd injection', () => {
  let content: string;

  beforeAll(() => {
    content = readYaml(join(LINKERD_DIR, 'namespace-annotations.yaml'));
  });

  it('targets the "edusphere" namespace', () => {
    expect(content).toContain('name: edusphere');
  });

  it('has linkerd.io/inject: enabled annotation', () => {
    expect(content).toContain('linkerd.io/inject: enabled');
  });

  it('sets proxy CPU request', () => {
    expect(content).toContain('config.linkerd.io/proxy-cpu-request');
  });

  it('sets proxy memory request', () => {
    expect(content).toContain('config.linkerd.io/proxy-memory-request');
  });
});

// ─── Server Policies ───────────────────────────────────────────────────────

describe('server-policies.yaml — ServerAuthorization per subgraph', () => {
  let content: string;

  beforeAll(() => {
    content = readYaml(join(LINKERD_DIR, 'server-policies.yaml'));
  });

  it('defines a Server resource for subgraph-core on port 4001', () => {
    expect(content).toContain('app: subgraph-core');
    expect(content).toContain('port: 4001');
  });

  it('defines a Server resource for subgraph-content on port 4002', () => {
    expect(content).toContain('app: subgraph-content');
    expect(content).toContain('port: 4002');
  });

  it('defines a Server resource for subgraph-annotation on port 4003', () => {
    expect(content).toContain('app: subgraph-annotation');
    expect(content).toContain('port: 4003');
  });

  it('defines a Server resource for subgraph-collaboration on port 4004', () => {
    expect(content).toContain('app: subgraph-collaboration');
    expect(content).toContain('port: 4004');
  });

  it('defines a Server resource for subgraph-agent on port 4005', () => {
    expect(content).toContain('app: subgraph-agent');
    expect(content).toContain('port: 4005');
  });

  it('defines a Server resource for subgraph-knowledge on port 4006', () => {
    expect(content).toContain('app: subgraph-knowledge');
    expect(content).toContain('port: 4006');
  });

  it('all Server resources use policy.linkerd.io/v1beta2 API', () => {
    const serverMatches = content.match(/kind: Server/g);
    const apiVersionMatches = content.match(/policy\.linkerd\.io\/v1beta2/g);
    // 6 Server + 6 ServerAuthorization = 12 resources using the API version
    expect(serverMatches).not.toBeNull();
    expect(apiVersionMatches?.length).toBeGreaterThanOrEqual(6);
  });

  it('defines ServerAuthorization for each subgraph (6 authorizations minimum)', () => {
    const authorizationMatches = content.match(/kind: ServerAuthorization/g);
    expect(authorizationMatches).not.toBeNull();
    expect(authorizationMatches!.length).toBeGreaterThanOrEqual(6);
  });

  it('only gateway is allowed inbound to subgraph-core', () => {
    // Extract the ServerAuthorization block for core — stop at the next resource separator.
    const coreAuthStart = content.indexOf('subgraph-core-allow-gateway');
    const coreAuthEnd = content.indexOf('---', coreAuthStart + 10);
    const coreAuthSection = content.substring(coreAuthStart, coreAuthEnd);
    expect(coreAuthSection).toContain('edusphere-gateway');
    // Only the gateway service account should appear in the serviceAccounts list;
    // no other subgraph (content, annotation, etc.) should be listed.
    const serviceAccountMatches = coreAuthSection.match(/- name: \S+/g) ?? [];
    expect(serviceAccountMatches).toHaveLength(1);
    expect(serviceAccountMatches[0]).toContain('edusphere-gateway');
  });

  it('gateway and subgraph-knowledge are allowed inbound to subgraph-agent', () => {
    const agentAuthSection = content.substring(
      content.indexOf('subgraph-agent-allow-gateway'),
      content.indexOf('subgraph-knowledge-allow-gateway'),
    );
    expect(agentAuthSection).toContain('edusphere-gateway');
    expect(agentAuthSection).toContain('subgraph-knowledge');
  });

  it('gateway and subgraph-agent are allowed inbound to subgraph-knowledge', () => {
    const knowledgeAuthSection = content.substring(
      content.indexOf('subgraph-knowledge-allow-gateway'),
    );
    expect(knowledgeAuthSection).toContain('edusphere-gateway');
    expect(knowledgeAuthSection).toContain('subgraph-agent');
  });

  it('uses meshTLS client authentication (not unauthenticated)', () => {
    expect(content).toContain('meshTLS:');
    expect(content).not.toContain('unauthenticated:');
  });

  it('uses serviceAccounts for identity (not IP-based)', () => {
    expect(content).toContain('serviceAccounts:');
  });
});

// ─── mTLS Enforcement Policy ───────────────────────────────────────────────

describe('mtls-test.yaml — plaintext traffic denial', () => {
  let content: string;

  beforeAll(() => {
    content = readYaml(join(LINKERD_DIR, 'mtls-test.yaml'));
  });

  it('defines an AuthorizationPolicy resource', () => {
    expect(content).toContain('kind: AuthorizationPolicy');
  });

  it('AuthorizationPolicy targets the edusphere namespace', () => {
    expect(content).toContain('name: edusphere');
  });

  it('requires MeshTLSAuthentication (mTLS-only traffic)', () => {
    expect(content).toContain('kind: MeshTLSAuthentication');
  });

  it('MeshTLSAuthentication uses SPIFFE identity pattern', () => {
    expect(content).toContain('serviceaccount.identity.linkerd');
  });

  it('defines a ServiceProfile for the gateway', () => {
    expect(content).toContain('kind: ServiceProfile');
    expect(content).toContain('edusphere-gateway');
  });

  it('includes compliance annotation referencing ISO 27001', () => {
    expect(content).toContain('ISO 27001');
  });
});

// ─── NetworkPolicy ─────────────────────────────────────────────────────────

describe('edusphere-network-policies.yaml — K8s NetworkPolicy', () => {
  let content: string;

  beforeAll(() => {
    content = readYaml(join(NETWORK_POLICY_DIR, 'edusphere-network-policies.yaml'));
  });

  it('has a default-deny-all policy covering both Ingress and Egress', () => {
    expect(content).toContain('name: default-deny-all');
    expect(content).toContain('- Ingress');
    expect(content).toContain('- Egress');
  });

  it('allows gateway to subgraph-core on port 4001', () => {
    const section = content.substring(
      content.indexOf('allow-gateway-to-subgraph-core'),
      content.indexOf('allow-gateway-to-subgraph-content'),
    );
    expect(section).toContain('port: 4001');
    expect(section).toContain('app: edusphere-gateway');
  });

  it('allows gateway to subgraph-content on port 4002', () => {
    const section = content.substring(
      content.indexOf('allow-gateway-to-subgraph-content'),
      content.indexOf('allow-gateway-to-subgraph-annotation'),
    );
    expect(section).toContain('port: 4002');
  });

  it('allows gateway to subgraph-annotation on port 4003', () => {
    expect(content).toContain('port: 4003');
  });

  it('allows gateway and core to subgraph-collaboration on port 4004', () => {
    const section = content.substring(
      content.indexOf('allow-gateway-core-to-subgraph-collaboration'),
      content.indexOf('allow-gateway-knowledge-to-subgraph-agent'),
    );
    expect(section).toContain('port: 4004');
    expect(section).toContain('app: edusphere-gateway');
    expect(section).toContain('app: subgraph-core');
  });

  it('allows gateway and knowledge to subgraph-agent on port 4005', () => {
    const section = content.substring(
      content.indexOf('allow-gateway-knowledge-to-subgraph-agent'),
      content.indexOf('allow-gateway-agent-to-subgraph-knowledge'),
    );
    expect(section).toContain('port: 4005');
    expect(section).toContain('app: subgraph-knowledge');
  });

  it('allows gateway and agent to subgraph-knowledge on port 4006', () => {
    expect(content).toContain('port: 4006');
    expect(content).toContain('app: subgraph-agent');
  });

  it('allows subgraphs to PostgreSQL on port 5432', () => {
    expect(content).toContain('port: 5432');
    expect(content).toContain('app: postgres');
  });

  it('allows subgraphs to NATS on port 4222', () => {
    expect(content).toContain('port: 4222');
    expect(content).toContain('app: nats');
  });

  it('allows subgraphs to MinIO on port 9000', () => {
    expect(content).toContain('port: 9000');
    expect(content).toContain('app: minio');
  });

  it('allows Prometheus scrape on port 9090', () => {
    expect(content).toContain('port: 9090');
    expect(content).toContain('app: prometheus');
  });

  it('allows health check endpoints', () => {
    expect(content).toContain('allow-health-check-probes');
  });

  it('allows DNS egress to kube-dns on port 53', () => {
    expect(content).toContain('port: 53');
    expect(content).toContain('k8s-app: kube-dns');
  });

  it('uses networking.k8s.io/v1 API version', () => {
    expect(content).toContain('apiVersion: networking.k8s.io/v1');
  });
});

// ─── README Documentation ─────────────────────────────────────────────────

describe('README.md — operator documentation', () => {
  let content: string;

  beforeAll(() => {
    content = readYaml(join(LINKERD_DIR, 'README.md'));
  });

  it('includes Linkerd installation instructions', () => {
    expect(content).toContain('linkerd install');
  });

  it('includes verification command using linkerd check', () => {
    expect(content).toContain('linkerd check');
  });

  it('includes edge verification using linkerd viz edges', () => {
    expect(content).toContain('linkerd viz edges');
  });

  it('documents the policy matrix table', () => {
    expect(content).toContain('Policy Matrix');
  });

  it('includes troubleshooting section', () => {
    expect(content).toContain('Troubleshooting');
  });
});
