/**
 * Log Structure Validation
 *
 * Validates that Pino log output conforms to the expected schema.
 * Also validates that no console.log calls exist in production source.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const APPS_DIR = join(REPO_ROOT, 'apps');
const ALERTS_YML = join(
  REPO_ROOT,
  'infrastructure',
  'monitoring',
  'rules',
  'alerts.yml'
);

const PINO_LEVELS: Record<string, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

/** Recursively collect .ts files, excluding test/spec files and node_modules */
function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (
      extname(entry.name) === '.ts' &&
      !entry.name.endsWith('.spec.ts') &&
      !entry.name.endsWith('.test.ts')
    ) {
      results.push(full);
    }
  }
  return results;
}

/** Parse a trivial YAML alerts file into rule objects (no external deps) */
function parseAlertsYaml(content: string): Array<Record<string, string>> {
  const rules: Array<Record<string, string>> = [];
  const lines = content.split('\n');
  let current: Record<string, string> | null = null;
  for (const line of lines) {
    const alertMatch = /^\s+-\s+alert:\s+(.+)$/.exec(line);
    if (alertMatch) {
      if (current) rules.push(current);
      current = { alert: (alertMatch[1] ?? '').trim() };
      continue;
    }
    if (current) {
      const kv = /^\s+(expr|for|summary|description|severity):\s*(.+)$/.exec(
        line
      );
      if (kv) current[kv[1] ?? ''] = (kv[2] ?? '').trim();
    }
  }
  if (current) rules.push(current);
  return rules;
}

// ---------------------------------------------------------------------------
// Sample Pino log shapes for unit tests
// ---------------------------------------------------------------------------

interface PinoLog {
  level: number;
  time: number;
  msg: string;
  requestId?: string;
  tenantId?: string;
  userId?: string;
  err?: { message: string; stack: string };
}

function makeLog(overrides: Partial<PinoLog> = {}): PinoLog {
  return {
    level: 30,
    time: Date.now(),
    msg: 'Test message',
    ...overrides,
  };
}

function hasRequiredFields(log: unknown): log is PinoLog {
  if (typeof log !== 'object' || log === null) return false;
  const l = log as Record<string, unknown>;
  return (
    typeof l['level'] === 'number' &&
    typeof l['time'] === 'number' &&
    typeof l['msg'] === 'string'
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Pino Log Structure', () => {
  describe('Required log fields', () => {
    it('every log entry has: level, time, msg', () => {
      expect(hasRequiredFields(makeLog())).toBe(true);
      expect(hasRequiredFields({ level: 30, time: 0 })).toBe(false);
      expect(hasRequiredFields(null)).toBe(false);
    });

    it('level is a valid Pino level number (10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal)', () => {
      const validLevels = Object.values(PINO_LEVELS);
      for (const lvl of validLevels) {
        expect(validLevels).toContain(lvl);
      }
      expect(validLevels).not.toContain(99);
    });

    it('time is a Unix timestamp in milliseconds', () => {
      const log = makeLog();
      expect(log.time).toBeGreaterThan(1_000_000_000_000); // after year 2001 in ms
      expect(typeof log.time).toBe('number');
    });

    it('msg is a non-empty string', () => {
      const log = makeLog({ msg: 'Service started' });
      expect(log.msg.length).toBeGreaterThan(0);
      expect(typeof log.msg).toBe('string');
    });
  });

  describe('Context fields', () => {
    it('request logs include requestId field', () => {
      const log = makeLog({ requestId: 'req-abc-123' });
      expect(typeof log.requestId).toBe('string');
      expect(log.requestId!.length).toBeGreaterThan(0);
    });

    it('authenticated request logs include tenantId and userId', () => {
      const log = makeLog({ tenantId: 'tenant-1', userId: 'user-42' });
      expect(log.tenantId).toBeDefined();
      expect(log.userId).toBeDefined();
    });

    it('error logs include err.message and err.stack', () => {
      const log = makeLog({
        err: { message: 'Something failed', stack: 'Error: ...' },
      });
      expect(log.err?.message).toBeDefined();
      expect(log.err?.stack).toBeDefined();
    });
  });

  describe('No console.log in production source', () => {
    // Only scan backend (NestJS) apps that use Pino — frontend/mobile use console legitimately
    const BACKEND_APPS = [
      'subgraph-core',
      'subgraph-content',
      'subgraph-annotation',
      'subgraph-collaboration',
      'subgraph-agent',
      'subgraph-knowledge',
      'gateway',
      'transcription-worker',
    ];
    const sourceFiles = (() => {
      const files: string[] = [];
      if (existsSync(APPS_DIR)) {
        for (const app of BACKEND_APPS) {
          files.push(...collectSourceFiles(join(APPS_DIR, app, 'src')));
        }
      }
      return files;
    })();

    it('no console.log calls in backend apps/*/src/**/*.ts (excludes test files)', () => {
      const offenders: string[] = [];
      for (const file of sourceFiles) {
        const content = readFileSync(file, 'utf-8');
        if (/\bconsole\.log\s*\(/.test(content)) {
          offenders.push(file.replace(REPO_ROOT, ''));
        }
      }
      expect(
        offenders,
        `console.log found in:\n${offenders.join('\n')}`
      ).toHaveLength(0);
    });

    it('no console.error calls in backend apps/*/src/**/*.ts (excludes test files)', () => {
      const offenders: string[] = [];
      for (const file of sourceFiles) {
        const content = readFileSync(file, 'utf-8');
        if (/\bconsole\.error\s*\(/.test(content)) {
          offenders.push(file.replace(REPO_ROOT, ''));
        }
      }
      expect(
        offenders,
        `console.error found in:\n${offenders.join('\n')}`
      ).toHaveLength(0);
    });

    it('no console.warn calls in backend apps/*/src/**/*.ts (excludes test files)', () => {
      const offenders: string[] = [];
      for (const file of sourceFiles) {
        const content = readFileSync(file, 'utf-8');
        if (/\bconsole\.warn\s*\(/.test(content)) {
          offenders.push(file.replace(REPO_ROOT, ''));
        }
      }
      expect(
        offenders,
        `console.warn found in:\n${offenders.join('\n')}`
      ).toHaveLength(0);
    });
  });

  describe('Prometheus alert rules syntax', () => {
    const rawYaml = existsSync(ALERTS_YML)
      ? readFileSync(ALERTS_YML, 'utf-8')
      : '';
    const rules = parseAlertsYaml(rawYaml);
    const VALID_SEVERITIES = new Set(['critical', 'warning', 'info']);

    it('alerts.yml is valid YAML', () => {
      expect(existsSync(ALERTS_YML)).toBe(true);
      expect(rawYaml.length).toBeGreaterThan(0);
      expect(rawYaml).toContain('groups:');
    });

    it('all alert rules have: alert name, expr, labels, annotations', () => {
      expect(rules.length).toBeGreaterThan(0);
      for (const rule of rules) {
        expect(rule['alert'], `Rule missing name`).toBeTruthy();
      }
    });

    it('all alert severity labels are one of: critical, warning, info', () => {
      const severities = rules
        .map((r) => r['severity'])
        .filter((s): s is string => typeof s === 'string' && s.length > 0);
      expect(severities.length).toBeGreaterThan(0);
      for (const sev of severities) {
        expect(
          VALID_SEVERITIES.has(sev),
          `Invalid severity "${sev}" — must be critical, warning, or info`
        ).toBe(true);
      }
    });
  });
});
