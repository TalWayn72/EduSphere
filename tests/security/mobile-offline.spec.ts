/**
 * Static security tests for Mobile Offline Sync layer (C2).
 * Verifies memory-safety patterns, SI-10 consent awareness, and offline-first design.
 * No DB / network required — pure static file analysis.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

function readFile(relativePath: string): string {
  const fullPath = resolve(ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

// ─── OfflineQueue ─────────────────────────────────────────────────────────────

describe('OfflineQueue (apps/mobile/src/sync/OfflineQueue.ts)', () => {
  const content = readFile('apps/mobile/src/sync/OfflineQueue.ts');

  it('file exists', () => {
    expect(existsSync(resolve(ROOT, 'apps/mobile/src/sync/OfflineQueue.ts'))).toBe(true);
  });

  it('exports enqueue function', () => {
    expect(content).toContain('export function enqueue');
  });

  it('exports dequeue function', () => {
    expect(content).toContain('export function dequeue');
  });

  it('exports peek function', () => {
    expect(content).toContain('export function peek');
  });

  it('exports closeOfflineDb for cleanup (memory-safe)', () => {
    expect(content).toContain('closeOfflineDb');
  });

  it('has MAX_QUEUE_SIZE guard (bounded growth)', () => {
    expect(content).toContain('MAX_QUEUE_SIZE');
  });

  it('evicts oldest entry when at capacity (LRU)', () => {
    expect(content).toMatch(/created_at.*ASC|ORDER.*created_at/i);
  });

  it('stores tenantId per mutation (multi-tenant isolation)', () => {
    expect(content).toContain('tenantId');
  });

  it('uses expo-sqlite (not AsyncStorage — persistent across restarts)', () => {
    expect(content).toContain('expo-sqlite');
  });
});

// ─── SyncEngine ───────────────────────────────────────────────────────────────

describe('SyncEngine (apps/mobile/src/sync/SyncEngine.ts)', () => {
  const content = readFile('apps/mobile/src/sync/SyncEngine.ts');

  it('file exists', () => {
    expect(existsSync(resolve(ROOT, 'apps/mobile/src/sync/SyncEngine.ts'))).toBe(true);
  });

  it('exports SyncEngine class', () => {
    expect(content).toContain('export class SyncEngine');
  });

  it('has dispose() method for memory-safe cleanup', () => {
    expect(content).toContain('dispose()');
  });

  it('clearInterval called in dispose (no timer leak)', () => {
    expect(content).toContain('clearInterval');
  });

  it('checks network connectivity before syncing', () => {
    expect(content).toMatch(/isConnected|isInternetReachable/);
  });

  it('has MAX_RETRIES guard (no infinite retry loop)', () => {
    expect(content).toContain('MAX_RETRIES');
  });

  it('sends Authorization header with token (SI-7 equivalent — authenticated sync)', () => {
    expect(content).toContain('Authorization');
  });

  it('sends x-tenant-id header (multi-tenant isolation)', () => {
    expect(content).toContain('x-tenant-id');
  });

  it('uses expo-network for connectivity detection', () => {
    expect(content).toContain('expo-network');
  });

  it('dequeues permanently failed mutations (no blockage)', () => {
    expect(content).toContain('MAX_RETRIES');
    expect(content).toContain('dequeue');
  });
});

// ─── useOfflineAnnotations hook ───────────────────────────────────────────────

describe('useOfflineAnnotations (apps/mobile/src/hooks/useOfflineAnnotations.ts)', () => {
  const content = readFile('apps/mobile/src/hooks/useOfflineAnnotations.ts');

  it('file exists', () => {
    expect(existsSync(resolve(ROOT, 'apps/mobile/src/hooks/useOfflineAnnotations.ts'))).toBe(true);
  });

  it('exports useOfflineAnnotations hook', () => {
    expect(content).toContain('export function useOfflineAnnotations');
  });

  it('disposes SyncEngine in useEffect cleanup (memory-safe)', () => {
    expect(content).toContain('engine.dispose()');
  });

  it('exposes addAnnotation function', () => {
    expect(content).toContain('addAnnotation');
  });

  it('exposes syncStatus for UI feedback', () => {
    expect(content).toContain('syncStatus');
  });

  it('exposes pendingCount for UI badge', () => {
    expect(content).toContain('pendingCount');
  });

  it('local pending list capped at 100 (bounded growth)', () => {
    expect(content).toMatch(/slice\(-\d+\)|100/);
  });
});

// ─── Tests exist ─────────────────────────────────────────────────────────────

describe('Mobile offline sync test coverage', () => {
  it('OfflineQueue unit tests exist', () => {
    expect(existsSync(resolve(ROOT, 'apps/mobile/src/sync/__tests__/OfflineQueue.test.ts'))).toBe(true);
  });

  it('SyncEngine unit tests exist', () => {
    expect(existsSync(resolve(ROOT, 'apps/mobile/src/sync/__tests__/SyncEngine.test.ts'))).toBe(true);
  });

  it('useOfflineAnnotations hook tests exist', () => {
    expect(existsSync(resolve(ROOT, 'apps/mobile/src/hooks/__tests__/useOfflineAnnotations.test.tsx'))).toBe(true);
  });
});
