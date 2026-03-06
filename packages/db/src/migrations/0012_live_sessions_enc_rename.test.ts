import { readFileSync } from 'fs';
import { join } from 'path';

const MIGRATION_PATH = join(__dirname, '0012_live_sessions_enc_rename.sql');

describe('0012_live_sessions_enc_rename migration', () => {
  let sql: string;

  beforeAll(() => {
    sql = readFileSync(MIGRATION_PATH, 'utf-8');
  });

  it('migration file exists and is readable', () => {
    expect(sql).toBeTruthy();
    expect(sql.length).toBeGreaterThan(0);
  });

  it('contains RENAME COLUMN for attendee_password to attendee_password_enc', () => {
    expect(sql).toMatch(/RENAME\s+COLUMN\s+attendee_password\s+TO\s+attendee_password_enc/i);
  });

  it('contains RENAME COLUMN for moderator_password to moderator_password_enc', () => {
    expect(sql).toMatch(/RENAME\s+COLUMN\s+moderator_password\s+TO\s+moderator_password_enc/i);
  });

  it('both target column names end with _enc', () => {
    const renames = [...sql.matchAll(/RENAME\s+COLUMN\s+\S+\s+TO\s+(\S+)/gi)];
    expect(renames.length).toBe(2);
    for (const match of renames) {
      const targetColumn = match[1].replace(/;$/, '');
      expect(targetColumn.endsWith('_enc')).toBe(true);
    }
  });

  it('does not reference the old plaintext column names as targets', () => {
    // Ensure we are renaming TO _enc variants, not keeping the old names
    expect(sql).not.toMatch(/TO\s+attendee_password[^_]/i);
    expect(sql).not.toMatch(/TO\s+moderator_password[^_]/i);
  });

  it('creates index on user_skill_mastery using correct column concept_id', () => {
    expect(sql).toMatch(/CREATE\s+INDEX.*idx_user_skill_mastery_user_skill/i);
    expect(sql).toMatch(/ON\s+user_skill_mastery\s*\(\s*user_id\s*,\s*concept_id\s*\)/i);
  });

  it('adds SI-3 comments on both encrypted columns', () => {
    expect(sql).toMatch(/COMMENT ON COLUMN live_sessions\.attendee_password_enc/i);
    expect(sql).toMatch(/COMMENT ON COLUMN live_sessions\.moderator_password_enc/i);
    expect(sql).toMatch(/AES-256-GCM/);
    expect(sql).toMatch(/SI-3/);
  });
});
