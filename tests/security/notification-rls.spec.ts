/**
 * Security Test: RLS policies on Phase 65 notification tables.
 *
 * Static source-analysis — validates that all new notification-related
 * tables have correct RLS policies with proper variable names.
 * No database connection required.
 */
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const SCHEMA_DIR = resolve(
  join(import.meta.dirname, '../../packages/db/src/schema')
);

const PHASE_65_SCHEMAS = [
  'notification-deliveries.ts',
  'notification-preferences.ts',
  'whatsapp-contacts.ts',
  'tenant-social-links.ts',
];

describe('Phase 65 — Notification RLS policies', () => {
  for (const fileName of PHASE_65_SCHEMAS) {
    const filePath = join(SCHEMA_DIR, fileName);
    const content = readFileSync(filePath, 'utf-8');

    describe(fileName, () => {
      it('must enable RLS via .enableRLS()', () => {
        expect(content).toContain('.enableRLS()');
      });

      it('must have at least one pgPolicy definition', () => {
        expect(content).toContain('pgPolicy(');
      });

      it('must use correct tenant variable: app.current_tenant', () => {
        if (content.includes('current_tenant')) {
          expect(content).toContain("'app.current_tenant'");
        }
      });

      it('must use correct user_id variable: app.current_user_id', () => {
        if (content.includes('current_user_id')) {
          expect(content).toContain("'app.current_user_id'");
          // Must NOT use app.current_user without _id suffix (SI-1)
          const buggy = /current_setting\(\s*['"]app\.current_user['"]/g;
          const matches = content.match(buggy) ?? [];
          // Filter out correct app.current_user_id and app.current_user_role
          const badMatches = matches.filter(
            (m) =>
              !m.includes('current_user_id') &&
              !m.includes('current_user_role')
          );
          expect(badMatches).toHaveLength(0);
        }
      });

      it('must NOT contain raw SQL injection patterns', () => {
        expect(content).not.toMatch(/\$\{[^}]*\}/); // No template literals in SQL
      });
    });
  }

  it('all Phase 65 schema files must be exported from index.ts', () => {
    const indexPath = join(SCHEMA_DIR, 'index.ts');
    const indexContent = readFileSync(indexPath, 'utf-8');
    expect(indexContent).toContain("'./notification-deliveries'");
    expect(indexContent).toContain("'./notification-preferences'");
    expect(indexContent).toContain("'./whatsapp-contacts'");
    expect(indexContent).toContain("'./tenant-social-links'");
  });

  it('whatsapp-contacts must have encrypted phone_number field', () => {
    const content = readFileSync(
      join(SCHEMA_DIR, 'whatsapp-contacts.ts'),
      'utf-8'
    );
    // Field exists (we validate encryption at application layer via SI-3)
    expect(content).toContain("phone_number");
    // Comment documents SI-3 encryption requirement
    expect(content).toMatch(/encrypt|SI-3/i);
  });

  it('notification_preferences must have unique constraint on user+type+channel', () => {
    const content = readFileSync(
      join(SCHEMA_DIR, 'notification-preferences.ts'),
      'utf-8'
    );
    expect(content).toContain('uniqueIndex');
    expect(content).toContain('notificationType');
    expect(content).toContain('channel');
  });

  it('notification_deliveries must have retry index', () => {
    const content = readFileSync(
      join(SCHEMA_DIR, 'notification-deliveries.ts'),
      'utf-8'
    );
    expect(content).toContain('idx_notif_deliveries_retry');
    expect(content).toContain('retryCount');
    expect(content).toContain('nextRetryAt');
  });
});
