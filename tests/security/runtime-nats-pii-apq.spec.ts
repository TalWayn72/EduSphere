/**
 * Wave 1 Security Tests — Runtime NATS TLS, PII Encryption, APQ Registry
 *
 * Static analysis tests that verify code patterns by reading source files.
 * No running server required — safe for every CI push.
 *
 * Coverage:
 *   SI-7  — NATS TLS enforcement via buildNatsOptions()
 *   SEC-4 — PII encryption key versioning
 *   SEC-8 — APQ registry Redis backend support
 *   OPS-4 — Alertmanager receiver configuration
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

function readFile(relativePath: string): string {
  const fullPath = resolve(ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

/**
 * Recursively collect all .ts files under a directory.
 */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
      results.push(...collectTsFiles(full));
    } else if (
      stat.isFile() &&
      (entry.endsWith('.ts') || entry.endsWith('.tsx'))
    ) {
      results.push(full);
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// SI-7: NATS TLS enforcement — all services use buildNatsOptions()
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-7: NATS TLS enforcement — services use buildNatsOptions()', () => {
  it('subgraph-agent NatsService imports buildNatsOptions from @edusphere/nats-client', () => {
    const content = readFile('apps/subgraph-agent/src/nats/nats.service.ts');
    expect(content).toBeTruthy();
    expect(content).toContain('buildNatsOptions');
    expect(content).toContain('@edusphere/nats-client');
  });

  it('subgraph-content AtRiskFlagService imports buildNatsOptions from @edusphere/nats-client', () => {
    // NATS usage moved from LiveSessionService to AtRiskFlagService
    const content = readFile(
      'apps/subgraph-content/src/at-risk/at-risk-flag.service.ts'
    );
    expect(content).toBeTruthy();
    expect(content).toContain('buildNatsOptions');
    expect(content).toContain('@edusphere/nats-client');
  });

  it('subgraph-agent NatsService calls buildNatsOptions() before connect()', () => {
    const content = readFile('apps/subgraph-agent/src/nats/nats.service.ts');
    // Must use buildNatsOptions() result when calling connect
    expect(content).toMatch(/buildNatsOptions\(\)/);
    expect(content).toMatch(/connect\(opts\)/);
    // Must NOT have bare connect({ servers: ... }) without buildNatsOptions
    const lines = content.split('\n');
    const bareConnectLines = lines.filter(
      (line) =>
        line.includes('connect({') &&
        line.includes('servers') &&
        !line.trim().startsWith('//')
    );
    expect(bareConnectLines).toHaveLength(0);
  });

  it('subgraph-content AtRiskFlagService uses buildNatsOptions() in connect', () => {
    const content = readFile(
      'apps/subgraph-content/src/at-risk/at-risk-flag.service.ts'
    );
    // The service must call buildNatsOptions() before connect
    expect(content).toMatch(/connect\(buildNatsOptions\(\)\)/);
  });

  it('packages/nats-client connection.ts exports buildNatsOptions supporting TLS via env vars', () => {
    const content = readFile('packages/nats-client/src/connection.ts');
    expect(content).toBeTruthy();
    expect(content).toContain('export function buildNatsOptions');
    expect(content).toContain('NATS_TLS_CERT');
    expect(content).toContain('NATS_TLS_KEY');
    expect(content).toContain('NATS_TLS_CA');
    expect(content).toContain('options.tls');
  });

  it('packages/nats-client connection.ts supports NKey authentication', () => {
    const content = readFile('packages/nats-client/src/connection.ts');
    expect(content).toContain('NATS_NKEY');
    expect(content).toContain('nkeyAuthenticator');
    expect(content).toContain('options.authenticator');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SI-7: No new raw NATS connections across all subgraphs
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-7: No raw NATS connections without buildNatsOptions()', () => {
  const subgraphDirs = [
    'apps/subgraph-core/src',
    'apps/subgraph-content/src',
    'apps/subgraph-annotation/src',
    'apps/subgraph-collaboration/src',
    'apps/subgraph-agent/src',
    'apps/subgraph-knowledge/src',
  ];

  it('every file importing connect from nats also references buildNatsOptions', () => {
    const violations: string[] = [];

    for (const dir of subgraphDirs) {
      const absDir = resolve(ROOT, dir);
      const tsFiles = collectTsFiles(absDir);

      for (const filePath of tsFiles) {
        // Skip test files and spec files
        if (filePath.includes('.spec.') || filePath.includes('.test.'))
          continue;

        const content = readFileSync(filePath, 'utf-8');

        // Check if file imports connect from nats
        const importsNatsConnect =
          content.includes("from 'nats'") && content.includes('connect');

        if (!importsNatsConnect) continue;

        // File uses NATS connect — it must also reference buildNatsOptions
        const usesBuildNatsOptions = content.includes('buildNatsOptions');

        if (!usesBuildNatsOptions) {
          const relative = filePath
            .replace(resolve(ROOT) + '\\', '')
            .replace(/\\/g, '/');
          violations.push(relative);
        }
      }
    }

    expect(
      violations,
      `Files importing nats connect() without buildNatsOptions: ${violations.join(', ')}`
    ).toHaveLength(0);
  });

  it('no subgraph file uses bare connect({ servers: }) pattern without buildNatsOptions in scope', { timeout: 30_000 }, () => {
    const bareConnectFiles: string[] = [];

    for (const dir of subgraphDirs) {
      const absDir = resolve(ROOT, dir);
      const tsFiles = collectTsFiles(absDir);

      for (const filePath of tsFiles) {
        if (filePath.includes('.spec.') || filePath.includes('.test.'))
          continue;

        const content = readFileSync(filePath, 'utf-8');

        // Pattern: connect({ servers: ... }) without buildNatsOptions anywhere in file
        const hasBareConnect = /connect\(\{\s*servers\s*:/.test(content);
        const hasBuildNatsOptions = content.includes('buildNatsOptions');

        if (hasBareConnect && !hasBuildNatsOptions) {
          const relative = filePath
            .replace(resolve(ROOT) + '\\', '')
            .replace(/\\/g, '/');
          bareConnectFiles.push(relative);
        }
      }
    }

    expect(
      bareConnectFiles,
      `Files with bare connect({ servers: }) without buildNatsOptions: ${bareConnectFiles.join(', ')}`
    ).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEC-4: PII encryption has key versioning
// ─────────────────────────────────────────────────────────────────────────────

describe('SEC-4: PII encryption key versioning', () => {
  const ENCRYPTION_FILE = 'packages/db/src/helpers/encryption.ts';

  it('encryption.ts exports CURRENT_KEY_VERSION constant', () => {
    const content = readFile(ENCRYPTION_FILE);
    expect(content).toBeTruthy();
    expect(content).toMatch(/const CURRENT_KEY_VERSION\s*=\s*'v1'/);
  });

  it('encryptField output starts with version prefix (v1:)', () => {
    const content = readFile(ENCRYPTION_FILE);
    // The encryptField function must embed CURRENT_KEY_VERSION in the output
    expect(content).toContain('`${CURRENT_KEY_VERSION}:${iv');
  });

  it('decryptField handles versioned format (v1:iv:tag:data)', () => {
    const content = readFile(ENCRYPTION_FILE);
    // Must check for 4-part split with version prefix
    expect(content).toMatch(/parts\.length === 4/);
    expect(content).toMatch(/parts\[0\].*startsWith\('v'\)/);
  });

  it('decryptField handles legacy 3-part format (iv:tag:data)', () => {
    const content = readFile(ENCRYPTION_FILE);
    // Must handle 3-part legacy format
    expect(content).toMatch(/parts\.length === 3/);
    // Comment or code mentioning legacy format
    expect(content).toMatch(/[Ll]egacy/);
  });

  it('migrateEncryptedField function exists for key rotation', () => {
    const content = readFile(ENCRYPTION_FILE);
    expect(content).toContain('export function migrateEncryptedField');
    // Must call both decryptField and encryptField internally
    expect(content).toMatch(/decryptField\(/);
    expect(content).toMatch(/encryptField\(/);
  });

  it('getKeyVersion function exists to extract version from ciphertext', () => {
    const content = readFile(ENCRYPTION_FILE);
    expect(content).toContain('export function getKeyVersion');
    // Must return "legacy" for unversioned ciphertext
    expect(content).toContain("'legacy'");
  });

  it('deriveTenantKey supports multiple key versions via env var naming', () => {
    const content = readFile(ENCRYPTION_FILE);
    expect(content).toContain('export function deriveTenantKey');
    // Must reference ENCRYPTION_MASTER_KEY and version-specific env vars
    expect(content).toContain('ENCRYPTION_MASTER_KEY');
    expect(content).toMatch(/ENCRYPTION_MASTER_KEY_\$\{/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEC-8: APQ registry supports Redis backend
// ─────────────────────────────────────────────────────────────────────────────

describe('SEC-8: APQ registry supports Redis backend', () => {
  const REGISTRY_FILE = 'apps/gateway/src/persisted-queries/registry.ts';

  it('registry.ts reads REDIS_URL from environment', () => {
    const content = readFile(REGISTRY_FILE);
    expect(content).toBeTruthy();
    expect(content).toContain("process.env['REDIS_URL']");
  });

  it('registry.ts dynamically imports redis client', () => {
    const content = readFile(REGISTRY_FILE);
    // Dynamic import ensures redis is an optional dependency
    // Implementation uses Function() wrapper to avoid TS module resolution
    expect(content).toMatch(/import\("redis"\)|import\('redis'\)/);
  });

  it('isRedisBackend() function exists and reflects readiness state', () => {
    const content = readFile(REGISTRY_FILE);
    expect(content).toContain('export function isRedisBackend');
    expect(content).toContain('redisReady');
  });

  it('registerQuerySync function exists for backward compatibility', () => {
    const content = readFile(REGISTRY_FILE);
    expect(content).toContain('export function registerQuerySync');
    // Must also write to memory for immediate lookupSync availability
    expect(content).toContain('memoryRegistry.set(hash, query)');
  });

  it('lookupQuerySync function exists for backward compatibility', () => {
    const content = readFile(REGISTRY_FILE);
    expect(content).toContain('export function lookupQuerySync');
    // Must check memory first, then async populate from Redis
    expect(content).toContain('memoryRegistry.get(hash)');
  });

  it('in-memory fallback has bounded size with LRU eviction', () => {
    const content = readFile(REGISTRY_FILE);
    expect(content).toMatch(/MAX_REGISTRY_SIZE\s*=\s*10[_,]?000/);
    // Eviction logic: delete oldest key when at capacity
    expect(content).toContain('memoryRegistry.keys().next().value');
  });

  it('Redis entries have TTL to prevent unbounded growth', () => {
    const content = readFile(REGISTRY_FILE);
    expect(content).toMatch(/REDIS_APQ_TTL\s*=\s*\d+/);
    // TTL passed in set call
    expect(content).toContain('EX');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OPS-4: Alertmanager routes to real receivers
// ─────────────────────────────────────────────────────────────────────────────

describe('OPS-4: Alertmanager routes to real receivers', () => {
  const ALERTMANAGER_FILE =
    'infrastructure/monitoring/alertmanager/alertmanager.yml';

  it('alertmanager.yml exists', () => {
    const fullPath = resolve(ROOT, ALERTMANAGER_FILE);
    expect(existsSync(fullPath)).toBe(true);
  });

  it('default receiver is NOT "null" or "blackhole"', () => {
    const content = readFile(ALERTMANAGER_FILE);
    expect(content).toBeTruthy();

    // Extract the default receiver from route config
    const receiverMatch = content.match(/receiver:\s*"?([^"\n]+)"?/);
    expect(receiverMatch).not.toBeNull();

    const defaultReceiver = receiverMatch![1]!.trim();
    expect(defaultReceiver).not.toBe('null');
    expect(defaultReceiver).not.toBe('blackhole');
    expect(defaultReceiver).not.toBe('devnull');
    expect(defaultReceiver.length).toBeGreaterThan(0);
  });

  it('Slack receiver is configured with channel and send_resolved', () => {
    const content = readFile(ALERTMANAGER_FILE);
    expect(content).toContain('slack_configs');
    expect(content).toMatch(/channel:\s*"#[^"]+"/);
    expect(content).toContain('send_resolved: true');
  });

  it('PagerDuty receiver is configured for critical alerts', () => {
    const content = readFile(ALERTMANAGER_FILE);
    expect(content).toContain('pagerduty_configs');
    expect(content).toContain('service_key');
  });

  it('critical alerts route to PagerDuty', () => {
    const content = readFile(ALERTMANAGER_FILE);
    // Must have a route matching severity: critical that goes to pagerduty
    expect(content).toMatch(/severity:\s*critical/);
    expect(content).toContain('receiver: "pagerduty"');
  });

  it('Slack webhook URL is sourced from env var (not hardcoded)', () => {
    const content = readFile(ALERTMANAGER_FILE);
    // The webhook URL must use environment variable substitution
    expect(content).toMatch(/\$\{SLACK_WEBHOOK_URL\}/);
    // Must NOT contain a hardcoded https://hooks.slack.com URL
    expect(content).not.toMatch(
      /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+/
    );
  });

  it('PagerDuty service key is sourced from env var (not hardcoded)', () => {
    const content = readFile(ALERTMANAGER_FILE);
    expect(content).toMatch(/\$\{PAGERDUTY_SERVICE_KEY\}/);
  });
});
