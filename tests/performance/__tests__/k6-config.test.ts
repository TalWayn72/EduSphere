import { describe, it, expect } from 'vitest';

// Import the config as a module — k6.config.js uses ES modules
// We validate the shape of the config objects
const K6_CONFIG_PATH = new URL('../k6.config.js', import.meta.url);

describe('k6 Configuration Safety Checks', () => {
  let config: {
    SMOKE_OPTIONS: { vus: number; duration: string; thresholds: Record<string, string[]> };
    LOAD_OPTIONS: { stages: Array<{ duration: string; target: number }>; thresholds: Record<string, string[]> };
    STRESS_OPTIONS: { stages: Array<{ duration: string; target: number }>; thresholds: Record<string, string[]> };
    SLA_THRESHOLDS: Record<string, string[]>;
  };

  it('k6.config.js is importable', async () => {
    config = (await import(K6_CONFIG_PATH.href)) as typeof config;
    expect(config).toBeDefined();
  });

  it('SMOKE_OPTIONS has safe VU count for CI (<=20)', async () => {
    config = config ?? ((await import(K6_CONFIG_PATH.href)) as typeof config);
    expect(config.SMOKE_OPTIONS.vus).toBeLessThanOrEqual(20);
  });

  it('SMOKE_OPTIONS has a duration string', async () => {
    config = config ?? ((await import(K6_CONFIG_PATH.href)) as typeof config);
    expect(typeof config.SMOKE_OPTIONS.duration).toBe('string');
    expect(config.SMOKE_OPTIONS.duration).toMatch(/^\d+[smh]$/);
  });

  it('SLA_THRESHOLDS p95 is under 500ms (API First SLA)', async () => {
    config = config ?? ((await import(K6_CONFIG_PATH.href)) as typeof config);
    const durationThreshold = config.SLA_THRESHOLDS['http_req_duration'];
    expect(durationThreshold).toBeDefined();
    expect(durationThreshold.some((t) => t.includes('p(95)<500'))).toBe(true);
  });

  it('SLA_THRESHOLDS error rate is under 1%', async () => {
    config = config ?? ((await import(K6_CONFIG_PATH.href)) as typeof config);
    const failThreshold = config.SLA_THRESHOLDS['http_req_failed'];
    expect(failThreshold).toBeDefined();
    expect(failThreshold.some((t) => t.includes('rate<0.01'))).toBe(true);
  });

  it('LOAD_OPTIONS stages sum to at least 9 minutes', async () => {
    config = config ?? ((await import(K6_CONFIG_PATH.href)) as typeof config);
    const totalMinutes = config.LOAD_OPTIONS.stages.reduce((sum, stage) => {
      const match = /^(\d+)m$/.exec(stage.duration);
      return sum + (match ? parseInt(match[1] ?? '0', 10) : 0);
    }, 0);
    expect(totalMinutes).toBeGreaterThanOrEqual(9);
  });

  it('scenario files exist (at least 5 k6 scenario files)', async () => {
    const { readdirSync } = await import('fs');
    const { join } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = fileURLToPath(new URL('.', import.meta.url));
    const scenariosDir = join(__dirname, '..', 'scenarios');
    const files = readdirSync(scenariosDir).filter((f) => f.endsWith('.k6.js'));
    expect(files.length).toBeGreaterThanOrEqual(5);
  });
});
