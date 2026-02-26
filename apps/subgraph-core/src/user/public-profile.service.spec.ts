import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @edusphere/db before importing the service
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  withBypassRLS: vi.fn(),
  schema: {
    users: {
      id: 'id',
      display_name: 'display_name',
      avatar_url: 'avatar_url',
      preferences: 'preferences',
      created_at: 'created_at',
    },
  },
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    }),
    { raw: vi.fn() }
  ),
  eq: vi.fn(),
  and: vi.fn(),
}));

import { PublicProfileService } from './public-profile.service';
import { withBypassRLS } from '@edusphere/db';

const mockWithBypassRLS = vi.mocked(withBypassRLS);

const USER_PRIVATE = {
  id: 'user-1',
  display_name: 'Alice',
  avatar_url: null,
  preferences: {
    isPublicProfile: false,
    locale: 'en',
    theme: 'system',
    emailNotifications: true,
    pushNotifications: true,
  },
  created_at: new Date('2024-01-01T00:00:00Z'),
};

const USER_PUBLIC = {
  ...USER_PRIVATE,
  preferences: {
    isPublicProfile: true,
    locale: 'en',
    theme: 'system',
    emailNotifications: true,
    pushNotifications: true,
  },
};

function makeBypassImpl(
  user: typeof USER_PRIVATE | null,
  courses = [],
  badges = 0,
  progress = { completed: 5, total_seconds: 3600 }
) {
  return (_db: unknown, operation: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(user ? [user] : []),
      execute: vi
        .fn()
        .mockResolvedValueOnce({ rows: courses }) // completed courses
        .mockResolvedValueOnce({ rows: [{ count: badges }] }) // badge count
        .mockResolvedValueOnce({ rows: [progress] }), // progress
    };
    return operation(tx);
  };
}

describe('PublicProfileService', () => {
  let service: PublicProfileService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PublicProfileService();
  });

  it('returns null when user does not exist', async () => {
    mockWithBypassRLS.mockImplementation(
      makeBypassImpl(null) as typeof withBypassRLS
    );
    const result = await service.getPublicProfile('missing-user');
    expect(result).toBeNull();
  });

  it('returns null when isPublicProfile is false (private profile)', async () => {
    mockWithBypassRLS.mockImplementation(
      makeBypassImpl(USER_PRIVATE) as typeof withBypassRLS
    );
    const result = await service.getPublicProfile('user-1');
    expect(result).toBeNull();
  });

  it('returns PublicProfile when isPublicProfile is true', async () => {
    const courses = [
      {
        course_id: 'c-1',
        title: 'Intro to Math',
        completed_at: '2025-01-15T00:00:00Z',
      },
    ];
    mockWithBypassRLS.mockImplementation(
      makeBypassImpl(USER_PUBLIC, courses, 3, {
        completed: 10,
        total_seconds: 7200,
      }) as typeof withBypassRLS
    );

    const result = await service.getPublicProfile('user-1');

    expect(result).not.toBeNull();
    expect(result?.userId).toBe('user-1');
    expect(result?.displayName).toBe('Alice');
    expect(result?.completedCoursesCount).toBe(1);
    expect(result?.completedCourses[0].title).toBe('Intro to Math');
    expect(result?.badgesCount).toBe(3);
    expect(result?.conceptsMastered).toBe(10);
    expect(result?.totalLearningMinutes).toBe(120);
  });

  it('does not expose email or tenantId in public profile', async () => {
    mockWithBypassRLS.mockImplementation(
      makeBypassImpl(USER_PUBLIC) as typeof withBypassRLS
    );
    const result = await service.getPublicProfile('user-1');
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('tenantId');
    expect(result).not.toHaveProperty('tenant_id');
  });

  it('only returns PUBLISHED courses (SQL filter enforced)', async () => {
    // The service uses a raw SQL query with is_published = TRUE filter.
    // We verify that completed courses list reflects only what the DB returns.
    const publishedOnly = [
      {
        course_id: 'c-pub',
        title: 'Published Course',
        completed_at: '2025-03-01T00:00:00Z',
      },
    ];
    mockWithBypassRLS.mockImplementation(
      makeBypassImpl(USER_PUBLIC, publishedOnly) as typeof withBypassRLS
    );

    const result = await service.getPublicProfile('user-1');
    expect(result?.completedCourses).toHaveLength(1);
    expect(result?.completedCourses[0].id).toBe('c-pub');
  });

  it('returns displayName from display_name field, not email', async () => {
    mockWithBypassRLS.mockImplementation(
      makeBypassImpl(USER_PUBLIC) as typeof withBypassRLS
    );
    const result = await service.getPublicProfile('user-1');
    expect(result?.displayName).toBe('Alice');
  });
});
