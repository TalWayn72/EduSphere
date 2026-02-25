/**
 * auth.middleware.spec.ts (subgraph-core)
 *
 * auth.middleware.ts is a thin re-export shim from @edusphere/auth.
 * These tests verify the re-exports are wired correctly.
 * The actual JWT logic is tested in packages/auth.
 */
import { describe, it, expect } from 'vitest';

import {
  AuthMiddleware,
  authMiddleware,
} from './auth.middleware';

import {
  AuthMiddleware as SharedAuthMiddleware,
  authMiddleware as sharedAuthMiddleware,
} from '@edusphere/auth';

describe('auth.middleware re-exports (subgraph-core)', () => {
  it('re-exports AuthMiddleware class from @edusphere/auth', () => {
    expect(AuthMiddleware).toBe(SharedAuthMiddleware);
  });

  it('re-exports authMiddleware singleton from @edusphere/auth', () => {
    expect(authMiddleware).toBe(sharedAuthMiddleware);
  });

  it('authMiddleware singleton is an instance of AuthMiddleware', () => {
    expect(authMiddleware).toBeInstanceOf(AuthMiddleware);
  });
});
