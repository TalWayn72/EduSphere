import { describe, it, expect } from 'vitest';
import { ADMIN_AUDIT_LOG_QUERY } from './audit.queries';

describe('audit.queries', () => {
  it('exports ADMIN_AUDIT_LOG_QUERY as a query string', () => {
    expect(ADMIN_AUDIT_LOG_QUERY).toBeDefined();
    expect(typeof ADMIN_AUDIT_LOG_QUERY).toBe('string');
    expect(ADMIN_AUDIT_LOG_QUERY).toContain('query AdminAuditLog');
  });
});
