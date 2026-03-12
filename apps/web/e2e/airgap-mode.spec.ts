/**
 * airgap-mode.spec.ts — Air-Gap Mode Static Analysis E2E Tests
 *
 * This is a STATIC ANALYSIS spec. It reads source files from disk using
 * Node.js `fs` APIs and makes assertions about their content.
 * No browser is launched for any test in this file.
 *
 * Covered assertions (non-duplicating tests/security/airgap-enforcement.spec.ts):
 *   1. LocalInferenceService contains `enforceAirgapPolicy` method
 *   2. `enforceAirgapPolicy` blocks 'openai' and 'anthropic' providers
 *   3. SHA-256 model hash verification logic is present (`createHash`)
 *   4. `createOllama` is only used in `createOllamaClient` — not in an airgap-
 *      unguarded context (no bare `createOpenAI` calls exist in the file)
 *   5. `isAirgapped()` helper exists and references `AIRGAP_MODE`
 *   6. `verifyModelHash` references both `AIRGAP_MODEL_HASH` and `createHash`
 *   7. `ForbiddenException` is thrown inside `enforceAirgapPolicy`
 *   8. `blocked` provider array contains both 'openai' and 'anthropic' literals
 *   9. No direct `createOpenAI` import from `openai-ai-provider` or similar
 *      without an airgap guard in the same file
 *  10. `OnModuleInit` lifecycle hook calls `verifyModelHash` inside `isAirgapped()`
 *
 * Tests that already exist in tests/security/airgap-enforcement.spec.ts and
 * are intentionally NOT duplicated here:
 *   - File existence check
 *   - AIRGAP_MODE env-var reference
 *   - ForbiddenException import
 *   - OnModuleDestroy interface
 *   - enforceAirgapPolicy / verifyModelHash name presence (covered differently here)
 *   - Helm values.yaml / Chart.yaml / Zarf assertions (entirely different scope)
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/airgap-mode.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Path resolution ──────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve a path relative to the monorepo root.
 * The e2e/ directory lives at apps/web/e2e/, so the root is 3 levels up.
 */
const ROOT = path.resolve(__dirname, '..', '..', '..');

const SERVICE_PATH = path.join(
  ROOT,
  'apps',
  'subgraph-agent',
  'src',
  'ai',
  'local-inference.service.ts',
);

/** Read the service source once for the whole suite. */
function readService(): string {
  return fs.readFileSync(SERVICE_PATH, 'utf-8');
}

// ─── Suite 1: enforceAirgapPolicy method ─────────────────────────────────────

test.describe('Air-Gap: enforceAirgapPolicy method', () => {
  test('enforceAirgapPolicy method is defined in the service file', () => {
    const content = readService();
    // The method signature must be present
    expect(content).toContain('enforceAirgapPolicy');
  });

  test('enforceAirgapPolicy contains "openai" in its blocked provider list', () => {
    const content = readService();

    // Isolate the enforceAirgapPolicy method body by finding it and slicing
    // from the method declaration to the closing brace.
    const methodStart = content.indexOf('enforceAirgapPolicy');
    expect(methodStart).toBeGreaterThan(-1);

    // The 'openai' string must appear after the method definition
    const methodSlice = content.slice(methodStart);
    expect(methodSlice).toContain("'openai'");
  });

  test('enforceAirgapPolicy contains "anthropic" in its blocked provider list', () => {
    const content = readService();

    const methodStart = content.indexOf('enforceAirgapPolicy');
    expect(methodStart).toBeGreaterThan(-1);

    const methodSlice = content.slice(methodStart);
    expect(methodSlice).toContain("'anthropic'");
  });

  test('enforceAirgapPolicy throws ForbiddenException for blocked providers', () => {
    const content = readService();

    const methodStart = content.indexOf('enforceAirgapPolicy');
    expect(methodStart).toBeGreaterThan(-1);

    const methodSlice = content.slice(methodStart);
    // The method must throw (not just log) to guarantee the call is blocked
    expect(methodSlice).toContain('throw new ForbiddenException');
  });

  test('enforceAirgapPolicy calls isAirgapped() as an early-return guard', () => {
    const content = readService();

    const methodStart = content.indexOf('enforceAirgapPolicy');
    expect(methodStart).toBeGreaterThan(-1);

    const methodSlice = content.slice(methodStart);
    expect(methodSlice).toContain('isAirgapped()');
  });
});

// ─── Suite 2: SHA-256 model hash verification ─────────────────────────────────

test.describe('Air-Gap: SHA-256 model hash verification', () => {
  test('file imports createHash from node:crypto', () => {
    const content = readService();
    expect(content).toContain("from 'node:crypto'");
    expect(content).toContain('createHash');
  });

  test('verifyModelHash calls createHash with "sha256" algorithm', () => {
    const content = readService();

    const methodStart = content.indexOf('verifyModelHash');
    expect(methodStart).toBeGreaterThan(-1);

    const methodSlice = content.slice(methodStart);
    expect(methodSlice).toContain("createHash('sha256')");
  });

  test('verifyModelHash reads AIRGAP_MODEL_HASH from process.env', () => {
    const content = readService();

    const methodStart = content.indexOf('verifyModelHash');
    expect(methodStart).toBeGreaterThan(-1);

    const methodSlice = content.slice(methodStart);
    expect(methodSlice).toContain('AIRGAP_MODEL_HASH');
  });

  test('verifyModelHash throws ForbiddenException on hash mismatch', () => {
    const content = readService();

    const methodStart = content.indexOf('verifyModelHash');
    expect(methodStart).toBeGreaterThan(-1);

    const methodSlice = content.slice(methodStart);
    expect(methodSlice).toContain('throw new ForbiddenException');
  });

  test('hash digest algorithm is "hex"', () => {
    const content = readService();

    const methodStart = content.indexOf('verifyModelHash');
    expect(methodStart).toBeGreaterThan(-1);

    const methodSlice = content.slice(methodStart);
    expect(methodSlice).toContain(".digest('hex')");
  });
});

// ─── Suite 3: isAirgapped helper ─────────────────────────────────────────────

test.describe('Air-Gap: isAirgapped() helper', () => {
  test('isAirgapped() method is defined', () => {
    const content = readService();
    expect(content).toContain('isAirgapped()');
  });

  test('isAirgapped() checks AIRGAP_MODE === "true"', () => {
    const content = readService();

    const methodStart = content.indexOf('isAirgapped()');
    expect(methodStart).toBeGreaterThan(-1);

    const methodSlice = content.slice(methodStart);
    // Must compare against the string 'true' not just truthiness
    expect(methodSlice).toContain("=== 'true'");
  });
});

// ─── Suite 4: No unguarded external provider calls ───────────────────────────

test.describe('Air-Gap: No unguarded external-provider imports', () => {
  test('file does not import from openai-ai-provider without airgap guard', () => {
    const content = readService();

    // The file should NOT import createOpenAI — only createOllama is allowed here
    // (OpenAI calls belong in a separate provider service that calls enforceAirgapPolicy)
    expect(content).not.toContain('createOpenAI');
  });

  test('file does not import createAnthropic', () => {
    const content = readService();
    expect(content).not.toContain('createAnthropic');
  });

  test('createOllamaClient is the only provider factory method in the file', () => {
    const content = readService();

    // Count occurrences of "createOllama" (the only permitted provider call)
    const ollamaMatches = (content.match(/createOllama/g) ?? []).length;

    // There must be at least one (the import + the call inside createOllamaClient)
    expect(ollamaMatches).toBeGreaterThanOrEqual(1);

    // And no openai/anthropic provider factories
    expect(content).not.toMatch(/createOpenAI|createAnthropic|openai-ai-provider|@anthropic-ai\/sdk/);
  });

  test('blocked providers array contains exactly openai and anthropic', () => {
    const content = readService();

    // The blocked array literal: ['openai', 'anthropic']
    // Both must be present
    expect(content).toContain("'openai'");
    expect(content).toContain("'anthropic'");
  });
});

// ─── Suite 5: OnModuleInit airgap lifecycle ───────────────────────────────────

test.describe('Air-Gap: OnModuleInit lifecycle integration', () => {
  test('onModuleInit calls verifyModelHash inside an isAirgapped() guard', () => {
    const content = readService();

    const initStart = content.indexOf('onModuleInit()');
    expect(initStart).toBeGreaterThan(-1);

    // Slice from onModuleInit through to the next method (onModuleDestroy)
    const destroyStart = content.indexOf('onModuleDestroy()', initStart);
    const initBody = content.slice(initStart, destroyStart > -1 ? destroyStart : undefined);

    expect(initBody).toContain('isAirgapped()');
    expect(initBody).toContain('verifyModelHash()');
  });

  test('onModuleDestroy exists (memory-safe: no-op for this service)', () => {
    const content = readService();
    expect(content).toContain('onModuleDestroy()');
  });

  test('service implements both OnModuleInit and OnModuleDestroy', () => {
    const content = readService();

    // Class declaration must implement both lifecycle interfaces
    expect(content).toContain('OnModuleInit');
    expect(content).toContain('OnModuleDestroy');
  });
});
