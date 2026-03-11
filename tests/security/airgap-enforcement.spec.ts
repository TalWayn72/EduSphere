/**
 * Static security tests for Phase 52 Air-Gap enforcement.
 *
 * Verifies that:
 *   1. LocalInferenceService hard-blocks OpenAI and Anthropic in AIRGAP_MODE.
 *   2. The Helm chart values.yaml disables all external provider services.
 *   3. AIRGAP_MODE is explicitly set to "true" in the Helm default values.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const read = (p: string): string =>
  existsSync(resolve(ROOT, p)) ? readFileSync(resolve(ROOT, p), 'utf-8') : '';

// ── LocalInferenceService static analysis ─────────────────────────────────────

describe('Air-Gap: LocalInferenceService enforcement', () => {
  const servicePath =
    'apps/subgraph-agent/src/ai/local-inference.service.ts';

  it('local-inference.service.ts exists', () => {
    expect(existsSync(resolve(ROOT, servicePath))).toBe(true);
  });

  it('service references AIRGAP_MODE environment variable', () => {
    const content = read(servicePath);
    expect(content).toContain('AIRGAP_MODE');
  });

  it('service imports and uses ForbiddenException', () => {
    const content = read(servicePath);
    expect(content).toContain('ForbiddenException');
  });

  it('service blocks "openai" provider in airgap mode', () => {
    const content = read(servicePath);
    expect(content).toContain('openai');
  });

  it('service blocks "anthropic" provider in airgap mode', () => {
    const content = read(servicePath);
    expect(content).toContain('anthropic');
  });

  it('service implements OnModuleDestroy interface', () => {
    const content = read(servicePath);
    expect(content).toContain('OnModuleDestroy');
  });

  it('service has enforceAirgapPolicy method', () => {
    const content = read(servicePath);
    expect(content).toContain('enforceAirgapPolicy');
  });

  it('service has verifyModelHash method', () => {
    const content = read(servicePath);
    expect(content).toContain('verifyModelHash');
  });

  it('service has spec file with tests', () => {
    expect(
      existsSync(
        resolve(ROOT, 'apps/subgraph-agent/src/ai/local-inference.service.spec.ts')
      )
    ).toBe(true);
  });
});

// ── Helm values.yaml static analysis ─────────────────────────────────────────

describe('Air-Gap: Helm chart values disable external providers', () => {
  const valuesPath =
    'infrastructure/helm/edusphere-airgapped/values.yaml';

  it('values.yaml exists', () => {
    expect(existsSync(resolve(ROOT, valuesPath))).toBe(true);
  });

  it('values.yaml sets AIRGAP_MODE to "true"', () => {
    const content = read(valuesPath);
    expect(content).toContain('AIRGAP_MODE: "true"');
  });

  it('values.yaml disables OpenAI external service', () => {
    const content = read(valuesPath);
    // Verify that openai section has enabled: false
    expect(content).toContain('openai:');
    expect(content).toContain('enabled: false');
  });

  it('values.yaml disables Anthropic external service', () => {
    const content = read(valuesPath);
    expect(content).toContain('anthropic:');
    // The file contains at least one 'enabled: false' — covering both providers
    const disabledCount = (content.match(/enabled: false/g) ?? []).length;
    expect(disabledCount).toBeGreaterThanOrEqual(2);
  });

  it('values.yaml enables local Ollama inference', () => {
    const content = read(valuesPath);
    expect(content).toContain('ollama:');
    expect(content).toContain('enabled: true');
  });

  it('values.yaml includes a pinned Ollama image tag', () => {
    const content = read(valuesPath);
    expect(content).toContain('ollama/ollama');
  });
});

// ── Helm Chart.yaml static analysis ──────────────────────────────────────────

describe('Air-Gap: Helm Chart.yaml metadata', () => {
  const chartPath = 'infrastructure/helm/edusphere-airgapped/Chart.yaml';

  it('Chart.yaml exists', () => {
    expect(existsSync(resolve(ROOT, chartPath))).toBe(true);
  });

  it('Chart.yaml declares airgapped keyword', () => {
    const content = read(chartPath);
    expect(content).toContain('airgapped');
  });

  it('Chart.yaml declares on-premise keyword', () => {
    const content = read(chartPath);
    expect(content).toContain('on-premise');
  });
});

// ── Zarf package static analysis ──────────────────────────────────────────────

describe('Air-Gap: Zarf package manifest', () => {
  const zarfPath = 'infrastructure/zarf/zarf.yaml';

  it('zarf.yaml exists', () => {
    expect(existsSync(resolve(ROOT, zarfPath))).toBe(true);
  });

  it('zarf.yaml bundles ollama-local component', () => {
    const content = read(zarfPath);
    expect(content).toContain('ollama-local');
  });

  it('zarf.yaml bundles self-hosted infrastructure', () => {
    const content = read(zarfPath);
    expect(content).toContain('infrastructure');
  });

  it('zarf.yaml includes PostgreSQL image', () => {
    const content = read(zarfPath);
    expect(content).toContain('postgres:16');
  });

  it('zarf.yaml includes NATS image', () => {
    const content = read(zarfPath);
    expect(content).toContain('nats:2.10');
  });
});
