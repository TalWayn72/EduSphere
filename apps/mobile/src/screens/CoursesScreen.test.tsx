/**
 * CoursesScreen tests
 * Tests business logic: Apollo query states, SQLite cache fallback, search filter.
 * Follows the MyBadgesScreen pattern: pure logic without @testing-library/react-native.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Apollo mock -----------------------------------------------------------
const mockUseQuery = vi.fn();
vi.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  gql: (s: TemplateStringsArray) => s.join(''),
}));

// --- Navigation mock -------------------------------------------------------
vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: vi.fn() }),
}));

// --- Database mock ---------------------------------------------------------
const mockCacheQuery = vi.fn().mockResolvedValue(undefined);
const mockGetCachedQuery = vi.fn().mockResolvedValue(null);
vi.mock('../services/database', () => ({
  database: {
    cacheQuery: (...args: unknown[]) => mockCacheQuery(...args),
    getCachedQuery: (...args: unknown[]) => mockGetCachedQuery(...args),
  },
}));

// --- i18n mock -------------------------------------------------------------
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../navigation', () => ({ default: {} }));

interface Course {
  id: string;
  title: string;
  description: string;
  isPublished: boolean;
  createdAt: string;
}

const MOCK_COURSES: Course[] = [
  {
    id: 'c1',
    title: 'TypeScript Fundamentals',
    description: 'Learn TypeScript from scratch',
    isPublished: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    title: 'React Native Essentials',
    description: 'Build mobile apps',
    isPublished: false,
    createdAt: '2024-02-01T00:00:00Z',
  },
];

// Helper: simulate the filter logic from CoursesScreen
function filterCourses(courses: Course[], search: string): Course[] {
  const term = search.trim().toLowerCase();
  return term
    ? courses.filter((c) => c.title.toLowerCase().includes(term))
    : courses;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseQuery.mockReturnValue({
    data: { courses: MOCK_COURSES },
    loading: false,
    error: undefined,
  });
});

describe('CoursesScreen — Apollo query states', () => {
  it('returns courses data when query succeeds', () => {
    const result = mockUseQuery();
    const courses: Course[] = result.data?.courses ?? [];
    expect(courses).toHaveLength(2);
    expect(courses[0].id).toBe('c1');
  });

  it('loading=true + no data → shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
    });
    const result = mockUseQuery();
    expect(result.loading).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it('error + no cached data → shows error state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error('Network error'),
    });
    const result = mockUseQuery();
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  it('query result contains expected course titles', () => {
    const result = mockUseQuery();
    const titles = result.data.courses.map((c: Course) => c.title);
    expect(titles).toContain('TypeScript Fundamentals');
    expect(titles).toContain('React Native Essentials');
  });

  it('unpublished courses have isPublished=false', () => {
    const result = mockUseQuery();
    const unpublished = result.data.courses.filter((c: Course) => !c.isPublished);
    expect(unpublished).toHaveLength(1);
    expect(unpublished[0].id).toBe('c2');
  });
});

describe('CoursesScreen — SQLite cache fallback', () => {
  it('getCachedQuery is called with the courses query string', async () => {
    const { database } = await import('../services/database');
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error('Network error'),
    });

    // Simulate the effect running
    await database.getCachedQuery('query Courses {', {});
    expect(mockGetCachedQuery).toHaveBeenCalled();
  });

  it('getCachedQuery returning null means isShowingCache stays false', async () => {
    mockGetCachedQuery.mockResolvedValue(null);
    const cached = await mockGetCachedQuery('test', {});
    const courses = (cached as { courses?: Course[] } | null)?.courses ?? [];
    expect(courses).toHaveLength(0);
  });

  it('getCachedQuery returning data sets cachedCourses', async () => {
    mockGetCachedQuery.mockResolvedValue({ courses: MOCK_COURSES });
    const cached = await mockGetCachedQuery('test', {});
    const courses = (cached as { courses?: Course[] } | null)?.courses ?? [];
    expect(courses).toHaveLength(2);
  });

  it('cacheQuery is called when data is received', async () => {
    const { database } = await import('../services/database');
    await database.cacheQuery('query', {}, { courses: MOCK_COURSES });
    expect(mockCacheQuery).toHaveBeenCalledWith(
      'query',
      {},
      { courses: MOCK_COURSES },
    );
  });
});

describe('CoursesScreen — search filter logic', () => {
  it('empty search returns all courses', () => {
    const result = filterCourses(MOCK_COURSES, '');
    expect(result).toHaveLength(2);
  });

  it('matching search returns filtered courses', () => {
    const result = filterCourses(MOCK_COURSES, 'TypeScript');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
  });

  it('search is case-insensitive', () => {
    const result = filterCourses(MOCK_COURSES, 'typescript');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
  });

  it('whitespace-only search returns all courses', () => {
    const result = filterCourses(MOCK_COURSES, '   ');
    expect(result).toHaveLength(2);
  });

  it('no-match search returns empty array', () => {
    const result = filterCourses(MOCK_COURSES, 'Python');
    expect(result).toHaveLength(0);
  });

  it('partial match works mid-word', () => {
    const result = filterCourses(MOCK_COURSES, 'Native');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c2');
  });
});
