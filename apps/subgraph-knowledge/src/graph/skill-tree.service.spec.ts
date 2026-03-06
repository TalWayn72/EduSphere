/**
 * SkillTreeService unit tests
 * Uses the same direct-instantiation + vi.mock pattern as skill-gap.service.spec.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock @edusphere/db ────────────────────────────────────────────────────────

const mockWithTenantContext = vi.fn();

vi.mock('@edusphere/db', () => ({
  db: {},
  sql: (strings: TemplateStringsArray, ..._values: unknown[]) =>
    strings.join('?'),
  withTenantContext: (
    _db: unknown,
    _ctx: unknown,
    fn: (tx: unknown) => Promise<unknown>
  ) => mockWithTenantContext(_db, _ctx, fn),
  eq: vi.fn(),
  and: vi.fn(),
}));

import { SkillTreeService } from './skill-tree.service.js';

// ─── Constants ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-uuid';
const USER_ID = 'user-uuid';
const COURSE_ID = 'course-uuid';
const ROLE = 'STUDENT';

// ─── Helper ────────────────────────────────────────────────────────────────────

function setupTx(...callResults: { rows: unknown[] }[]) {
  mockWithTenantContext.mockImplementation(
    (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) => {
      let callCount = 0;
      const tx = {
        execute: () => {
          // eslint-disable-next-line security/detect-object-injection
          const result = callResults[callCount] ?? { rows: [] };
          callCount++;
          return Promise.resolve(result);
        },
      };
      return fn(tx);
    }
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SkillTreeService', () => {
  let service: SkillTreeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SkillTreeService();
  });

  describe('getSkillTree()', () => {
    it('returns empty skill tree when no content items exist', async () => {
      setupTx({ rows: [] }, { rows: [] });
      const result = await service.getSkillTree(COURSE_ID, TENANT_ID, USER_ID, ROLE);
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('maps content items to skill tree nodes', async () => {
      setupTx(
        { rows: [{ id: 'id-1', name: 'React' }, { id: 'id-2', name: 'TypeScript' }] },
        { rows: [] } // mastery
      );
      const result = await service.getSkillTree(COURSE_ID, TENANT_ID, USER_ID, ROLE);
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0]?.label).toBe('React');
      expect(result.nodes[1]?.label).toBe('TypeScript');
    });

    it('defaults masteryLevel to NONE when no mastery rows', async () => {
      setupTx(
        { rows: [{ id: 'id-1', name: 'React' }] },
        { rows: [] }
      );
      const result = await service.getSkillTree(COURSE_ID, TENANT_ID, USER_ID, ROLE);
      expect(result.nodes[0]?.masteryLevel).toBe('NONE');
    });

    it('applies mastery levels from user_skill_mastery', async () => {
      setupTx(
        { rows: [{ id: 'id-1', name: 'React' }, { id: 'id-2', name: 'TypeScript' }] },
        { rows: [{ concept_id: 'id-1', mastery_level: 'PROFICIENT' }] }
      );
      const result = await service.getSkillTree(COURSE_ID, TENANT_ID, USER_ID, ROLE);
      expect(result.nodes[0]?.masteryLevel).toBe('PROFICIENT');
      expect(result.nodes[1]?.masteryLevel).toBe('NONE');
    });

    it('creates linear chain edges between nodes', async () => {
      setupTx(
        { rows: [{ id: 'id-1', name: 'A' }, { id: 'id-2', name: 'B' }, { id: 'id-3', name: 'C' }] },
        { rows: [] }
      );
      const result = await service.getSkillTree(COURSE_ID, TENANT_ID, USER_ID, ROLE);
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0]).toEqual({ source: 'id-1', target: 'id-2' });
      expect(result.edges[1]).toEqual({ source: 'id-2', target: 'id-3' });
    });

    it('returns gracefully when user_skill_mastery table is missing', async () => {
      mockWithTenantContext.mockImplementation(
        (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) => {
          let callCount = 0;
          const tx = {
            execute: () => {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve({ rows: [{ id: 'id-1', name: 'React' }] });
              }
              return Promise.reject(
                new Error('relation "user_skill_mastery" does not exist')
              );
            },
          };
          return fn(tx);
        }
      );
      const result = await service.getSkillTree(COURSE_ID, TENANT_ID, USER_ID, ROLE);
      expect(result.nodes[0]?.masteryLevel).toBe('NONE');
    });
  });

  describe('updateMasteryLevel()', () => {
    it('upserts and returns updated node', async () => {
      setupTx(
        { rows: [] }, // upsert
        { rows: [{ name: 'React' }] } // fetch label
      );
      const result = await service.updateMasteryLevel(
        'id-1',
        'PROFICIENT',
        TENANT_ID,
        USER_ID,
        ROLE
      );
      expect(result.masteryLevel).toBe('PROFICIENT');
      expect(result.label).toBe('React');
    });

    it('falls back to nodeId as label when content_item not found', async () => {
      setupTx(
        { rows: [] }, // upsert
        { rows: [] }  // empty label result
      );
      const result = await service.updateMasteryLevel(
        'my-node-id',
        'FAMILIAR',
        TENANT_ID,
        USER_ID,
        ROLE
      );
      expect(result.masteryLevel).toBe('FAMILIAR');
      expect(result.label).toBe('my-node-id');
    });
  });
});
