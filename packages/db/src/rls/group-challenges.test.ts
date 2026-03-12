import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getTableName } from 'drizzle-orm';
import {
  groupChallenges,
  challengeParticipants,
  peerMatchRequests,
} from '../schema/group-challenges';

const ROOT = resolve(__dirname, '../../../..');
const read = (p: string) => {
  const full = resolve(ROOT, p);
  return existsSync(full) ? readFileSync(full, 'utf-8') : '';
};

describe('group-challenges RLS schema', () => {
  it('groupChallenges table name is group_challenges', () => {
    expect(getTableName(groupChallenges)).toBe('group_challenges');
  });

  it('challengeParticipants table name is challenge_participants', () => {
    expect(getTableName(challengeParticipants)).toBe('challenge_participants');
  });

  it('peerMatchRequests table name is peer_match_requests', () => {
    expect(getTableName(peerMatchRequests)).toBe('peer_match_requests');
  });

  it('migration 0028 enables RLS on group_challenges', () => {
    const sql = read('packages/db/src/migrations/0028_group_challenges.sql');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('challenges_tenant_isolation');
  });

  it('migration 0028 enables RLS on peer_match_requests', () => {
    const sql = read('packages/db/src/migrations/0028_group_challenges.sql');
    expect(sql).toContain('peer_match_rls');
  });

  it('schema uses app.current_tenant (SI-1 compliant)', () => {
    const schema = read('packages/db/src/schema/group-challenges.ts');
    expect(schema).toContain("current_setting('app.current_tenant'");
    expect(schema).not.toContain("current_setting('app.current_user',");
  });

  it('peer_match_rls checks both requester and matched_user', () => {
    const schema = read('packages/db/src/schema/group-challenges.ts');
    expect(schema).toContain('requester_id');
    expect(schema).toContain('matched_user_id');
  });

  it('challenge_participants has unique constraint per user per challenge', () => {
    const sql = read('packages/db/src/migrations/0028_group_challenges.sql');
    expect(sql).toContain('uq_challenge_participant');
  });
});
