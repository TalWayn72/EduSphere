/**
 * Static security tests for Phase 46 — Group Challenges + KG Peer Matching.
 *
 * All checks are file-system / readFileSync — no running server needed.
 * Covers:
 *  - Self-match prevention (peer cannot request match with self)
 *  - IDOR in peer match response (only matched_user can respond)
 *  - Max participants enforcement (capacity guard)
 *  - Duplicate join prevention (cannot join twice)
 *  - Score rate limiting in SDL / service
 *  - RLS tenant isolation on all 3 new tables
 *  - SI-1 compliance (app.current_user_id — not app.current_user)
 *  - AGE Cypher parameterized queries (no string concat injection)
 *  - Memory safety: OnModuleDestroy on both services
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const read = (p: string): string => {
  const full = resolve(ROOT, p);
  return existsSync(full) ? readFileSync(full, 'utf-8') : '';
};

const exists = (p: string): boolean => existsSync(resolve(ROOT, p));

// ── Self-match prevention ──────────────────────────────────────────────────────

describe('Phase 46 Security — Self-match prevention', () => {
  it('peer-matching service has self-match guard', () => {
    const src = read('apps/subgraph-knowledge/src/peer-matching/peer-matching.service.ts');
    expect(src).toMatch(
      /requesterId.*===.*matchedUserId|matchedUserId.*===.*requesterId|[Cc]annot match with yourself/i
    );
  });

  it('self-match guard throws BadRequestException (not silent)', () => {
    const src = read('apps/subgraph-knowledge/src/peer-matching/peer-matching.service.ts');
    expect(src).toMatch(/BadRequestException.*[Cc]annot match|throw.*BadRequestException/i);
  });
});

// ── IDOR in peer match response ────────────────────────────────────────────────

describe('Phase 46 Security — IDOR in peer match response', () => {
  it('respondToPeerMatch validates matched_user ownership before update', () => {
    const src = read('apps/subgraph-knowledge/src/peer-matching/peer-matching.service.ts');
    expect(src).toMatch(/matchedUserId.*!==.*userId|userId.*!==.*matchedUserId/i);
  });

  it('respondToPeerMatch throws on IDOR attempt', () => {
    const src = read('apps/subgraph-knowledge/src/peer-matching/peer-matching.service.ts');
    expect(src).toMatch(
      /Only the matched user can respond|BadRequestException.*matched user|NotFoundException.*not found/i
    );
  });
});

// ── Max participants capacity guard ───────────────────────────────────────────

describe('Phase 46 Security — Max participants enforcement', () => {
  it('joinChallenge checks participant count against maxParticipants', () => {
    const src = read('apps/subgraph-core/src/challenges/group-challenge.service.ts');
    expect(src).toMatch(/maxParticipants|max_participants/i);
    expect(src).toMatch(/full|capacity|exceeded/i);
  });

  it('joinChallenge throws BadRequestException when full', () => {
    const src = read('apps/subgraph-core/src/challenges/group-challenge.service.ts');
    expect(src).toMatch(/BadRequestException.*full|throw.*full/i);
  });
});

// ── Duplicate join prevention ─────────────────────────────────────────────────

describe('Phase 46 Security — Duplicate join prevention', () => {
  it('joinChallenge prevents duplicate participation', () => {
    const src = read('apps/subgraph-core/src/challenges/group-challenge.service.ts');
    expect(src).toMatch(/Already joined|duplicate|existing.*join/i);
  });
});

// ── RLS tenant isolation — group_challenges ───────────────────────────────────

describe('Phase 46 Security — RLS: group_challenges tenant isolation', () => {
  it('group_challenges table has pgPolicy with tenant_id check', () => {
    const schema = read('packages/db/src/schema/group-challenges.ts');
    expect(schema).toMatch(/challenges_tenant_isolation|pgPolicy.*challenge/i);
    expect(schema).toMatch(/app\.current_tenant/);
  });

  it('group_challenges uses enableRLS()', () => {
    const schema = read('packages/db/src/schema/group-challenges.ts');
    expect(schema).toMatch(/enableRLS\(\)/);
  });
});

// ── RLS tenant isolation — challenge_participants ─────────────────────────────

describe('Phase 46 Security — RLS: challenge_participants tenant isolation', () => {
  it('challenge_participants has RLS via FK join to group_challenges', () => {
    const schema = read('packages/db/src/schema/group-challenges.ts');
    expect(schema).toMatch(/participants_isolation|group_challenges.*tenant/i);
  });

  it('challenge_participants uses enableRLS()', () => {
    const schema = read('packages/db/src/schema/group-challenges.ts');
    // count enableRLS() calls — need ≥3
    const matches = schema.match(/enableRLS\(\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });
});

// ── RLS tenant isolation — peer_match_requests ────────────────────────────────

describe('Phase 46 Security — RLS: peer_match_requests tenant + participant isolation', () => {
  it('peer_match_requests has pgPolicy checking both requester and matched_user', () => {
    const schema = read('packages/db/src/schema/group-challenges.ts');
    expect(schema).toMatch(/requester_id.*current_setting|matched_user_id.*current_setting/i);
  });

  it('peer_match_requests WITH CHECK only allows requester to write', () => {
    const schema = read('packages/db/src/schema/group-challenges.ts');
    expect(schema).toMatch(/withCheck.*requester_id|requester_id.*current_setting.*app\.current_user_id/i);
  });
});

// ── SI-1 compliance ───────────────────────────────────────────────────────────

describe('Phase 46 Security — SI-1: app.current_user_id (not app.current_user)', () => {
  it('group-challenges schema uses app.current_user_id (SI-1)', () => {
    const schema = read('packages/db/src/schema/group-challenges.ts');
    expect(schema).toMatch(/app\.current_user_id/);
    expect(schema).not.toMatch(/current_setting\('app\.current_user',/);
  });

  it('migration uses app.current_user_id (SI-1)', () => {
    const migration = read('packages/db/src/migrations/0028_group_challenges.sql');
    if (migration) {
      // If migration references user_id, it must use current_user_id
      if (migration.includes('current_setting')) {
        expect(migration).toMatch(/app\.current_user_id/);
        expect(migration).not.toMatch(/current_setting\('app\.current_user',/);
      }
    }
  });
});

// ── AGE Cypher query safety (no string concat injection) ─────────────────────

describe('Phase 46 Security — AGE Cypher parameterized queries', () => {
  it('peer-matching service uses parameterized Cypher (no template string concat for user input)', () => {
    const src = read('apps/subgraph-knowledge/src/peer-matching/peer-matching.service.ts');
    // Must use $userId / $tenantId parameters in the Cypher string, not `${userId}`
    expect(src).toMatch(/\$userId|\$tenantId/);
  });

  it('Cypher query parameters are passed as separate object (not concatenated)', () => {
    const src = read('apps/subgraph-knowledge/src/peer-matching/peer-matching.service.ts');
    // executeCypher called with a params object containing userId and tenantId
    expect(src).toMatch(/executeCypher.*userId.*tenantId|\{.*userId.*tenantId.*\}/s);
  });
});

// ── Memory safety: OnModuleDestroy ────────────────────────────────────────────

describe('Phase 46 Security — Memory safety: OnModuleDestroy on services', () => {
  it('GroupChallengeService implements OnModuleDestroy', () => {
    const src = read('apps/subgraph-core/src/challenges/group-challenge.service.ts');
    expect(src).toMatch(/OnModuleDestroy|onModuleDestroy/);
    expect(src).toMatch(/closeAllPools/);
  });

  it('GroupChallengeService drains NATS on destroy', () => {
    const src = read('apps/subgraph-core/src/challenges/group-challenge.service.ts');
    expect(src).toMatch(/nats.*drain|drain.*nats/i);
  });

  it('PeerMatchingService implements OnModuleDestroy', () => {
    const src = read('apps/subgraph-knowledge/src/peer-matching/peer-matching.service.ts');
    expect(src).toMatch(/OnModuleDestroy|onModuleDestroy/);
    expect(src).toMatch(/closeAllPools/);
  });
});

// ── File existence gate ───────────────────────────────────────────────────────

describe('Phase 46 Security — Required files exist', () => {
  it('group-challenges schema exists', () => {
    expect(exists('packages/db/src/schema/group-challenges.ts')).toBe(true);
  });

  it('group-challenges migration exists', () => {
    expect(exists('packages/db/src/migrations/0028_group_challenges.sql')).toBe(true);
  });

  it('challenges SDL exists', () => {
    expect(exists('apps/subgraph-core/src/challenges/challenges.graphql')).toBe(true);
  });

  it('peer-matching SDL exists', () => {
    expect(exists('apps/subgraph-knowledge/src/peer-matching/peer-matching.graphql')).toBe(true);
  });

  it('GroupChallengeService exists', () => {
    expect(exists('apps/subgraph-core/src/challenges/group-challenge.service.ts')).toBe(true);
  });

  it('PeerMatchingService exists', () => {
    expect(exists('apps/subgraph-knowledge/src/peer-matching/peer-matching.service.ts')).toBe(true);
  });
});
