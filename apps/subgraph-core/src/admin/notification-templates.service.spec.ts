/**
 * notification-templates.service.spec.ts
 * Unit tests for NotificationTemplatesService.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockExecute = vi.fn();

vi.mock('@edusphere/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    execute: (...args: unknown[]) => mockExecute(...args),
  },
  notificationTemplates: {
    id: 'id',
    tenantId: 'tenant_id',
    key: 'key',
    name: 'name',
    subject: 'subject',
    bodyHtml: 'body_html',
    variables: 'variables',
    isActive: 'is_active',
    updatedAt: 'updated_at',
  },
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  sql: Object.assign(
    vi.fn((_strings: TemplateStringsArray) => 'sql-template'),
    { raw: vi.fn() }
  ),
}));

import { NotificationTemplatesService } from './notification-templates.service.js';

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'tmpl-1',
    key: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome!',
    bodyHtml: '<p>Welcome</p>',
    variables: ['user.name'],
    isActive: true,
    updatedAt: new Date('2026-01-01'),
    tenantId: 'tenant-1',
    ...overrides,
  };
}

describe('NotificationTemplatesService', () => {
  let service: NotificationTemplatesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationTemplatesService();
    // seedDefaults always resolves silently in unit tests
    mockExecute.mockResolvedValue({});
  });

  // ── getTemplates ──────────────────────────────────────────────────────────

  it('returns mapped rows for the tenant', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([makeRow()]),
        }),
      }),
    });
    const result = await service.getTemplates('tenant-1');
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('welcome');
    expect(result[0].id).toBe('tmpl-1');
  });

  it('includes isActive in mapped row', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([makeRow({ isActive: false })]),
        }),
      }),
    });
    const result = await service.getTemplates('tenant-1');
    expect(result[0].isActive).toBe(false);
  });

  // ── updateTemplate ────────────────────────────────────────────────────────

  it('updates subject, bodyHtml, isActive and returns mapped row', async () => {
    const updated = makeRow({ subject: 'New Subject' });
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });
    const result = await service.updateTemplate(
      'tmpl-1',
      { subject: 'New Subject' },
      'tenant-1'
    );
    expect(result.subject).toBe('New Subject');
  });

  it('throws when template not found during update', async () => {
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    await expect(
      service.updateTemplate('no-such', {}, 'tenant-1')
    ).rejects.toThrow('not found');
  });

  // ── resetTemplate ─────────────────────────────────────────────────────────

  it('resets to defaults and returns mapped row', async () => {
    const resetRow = makeRow({ subject: 'Welcome to {{tenant.name}}!' });
    // First select: finds the key
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ key: 'welcome' }]),
        }),
      }),
    });
    // Update: returns reset row
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([resetRow]),
        }),
      }),
    });
    const result = await service.resetTemplate('tmpl-1', 'tenant-1');
    expect(result.subject).toBe('Welcome to {{tenant.name}}!');
  });

  it('throws when template key not found during reset', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    await expect(service.resetTemplate('ghost', 'tenant-1')).rejects.toThrow('not found');
  });

  // ── onModuleDestroy ───────────────────────────────────────────────────────

  it('calls closeAllPools on destroy', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });
});
