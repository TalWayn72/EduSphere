/**
 * SI-5 Security Test: NODE_TLS_REJECT_UNAUTHORIZED=0 Bypass Detection
 *
 * Static source-analysis test — checks production config and script files
 * for NODE_TLS_REJECT_UNAUTHORIZED=0, which disables TLS certificate
 * validation and enables MITM attacks.
 *
 * Scans: Dockerfile, supervisord.conf, shell scripts, docker-compose files.
 * No running server or Docker required.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');

/** Production files that must NEVER contain TLS bypass. */
const PRODUCTION_FILES = [
  'Dockerfile',
  'infrastructure/docker/supervisord.conf',
  'scripts/health-check.sh',
  'scripts/smoke-test.sh',
  'docker-compose.yml',
  'docker-compose.prod.yml',
  'infrastructure/docker/Dockerfile.prod',
  'infrastructure/k8s/deployment.yml',
].map((f) => resolve(ROOT, f));

const TLS_BYPASS_PATTERN = /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0['"]?/;

describe('TLS bypass detection (SI-5)', () => {
  it('must NOT contain NODE_TLS_REJECT_UNAUTHORIZED=0 in any production config', () => {
    const violations: { file: string; line: number; content: string }[] = [];

    for (const filePath of PRODUCTION_FILES) {
      if (!existsSync(filePath)) continue;
      try {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (TLS_BYPASS_PATTERN.test(lines[i])) {
            violations.push({
              file: filePath.replace(ROOT + '/', '').replace(ROOT + '\\', ''),
              line: i + 1,
              content: lines[i].trim(),
            });
          }
        }
      } catch {
        // skip unreadable files
      }
    }

    if (violations.length > 0) {
      const details = violations
        .map((v) => `  ${v.file}:${v.line} → ${v.content}`)
        .join('\n');
      expect.fail(
        `Found ${violations.length} TLS bypass violation(s):\n${details}`
      );
    }
  });

  it('supervisord.conf must not disable TLS for package installs', () => {
    const path = resolve(ROOT, 'infrastructure/docker/supervisord.conf');
    const content = readFileSync(path, 'utf-8');
    expect(content).not.toContain('NODE_TLS_REJECT_UNAUTHORIZED');
  });

  it('health-check.sh must not disable TLS for npm installs', () => {
    const path = resolve(ROOT, 'scripts/health-check.sh');
    const content = readFileSync(path, 'utf-8');
    expect(content).not.toContain('NODE_TLS_REJECT_UNAUTHORIZED');
  });
});
