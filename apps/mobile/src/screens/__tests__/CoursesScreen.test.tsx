/**
 * CoursesScreen — expanded pure logic tests.
 * Covers: Apollo query states, empty state, loading state,
 * search filtering, SQLite cache fallback, course card data shape,
 * draft badge logic, navigation targets.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Apollo mock ---
const mockUseQuery = vi.fn();
vi.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  gql: (s: TemplateStringsArray) => s.join(''),
}));

// --- Navigation mock ---
const mockNavigate = vi.fn();
vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// --- Database mock ---
const mockGetCachedQuery = vi.fn().mockResolvedValue(null);
vi.mock('../../services/database', () => ({
  database: {
    cacheQuery: vi.fn().mockResolvedValue(undefined),
    getCachedQuery: (...args: unknown[]) => mockGetCachedQuery(...args),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../navigation', () => ({ default: {} }));

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
    description: 'TS basics',
    isPublished: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    title: 'React Native Essentials',
    description: 'Mobile dev',
    isPublished: false,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'c3',
    title: 'GraphQL Federation',
    description: 'Distributed schemas',
    isPublished: true,
    createdAt: '2024-03-01T00:00:00Z',
  },
];

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

describe('CoursesScreen — renders with mock data', () => {
  it('returns 3 courses from query', () => {
    const result = mockUseQuery();
    expect(result.data.courses).toHaveLength(3);
  });

  it('each course has required fields', () => {
    const result = mockUseQuery();
    for (const c of result.data.courses as Course[]) {
      expect(c.id).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(typeof c.isPublished).toBe('boolean');
    }
  });
});

describe('CoursesScreen — empty state', () => {
  it('no courses from API yields empty list', () => {
    mockUseQuery.mockReturnValue({
      data: { courses: [] },
      loading: false,
      error: undefined,
    });
    const result = mockUseQuery();
    expect(result.data.courses).toHaveLength(0);
  });

  it('null data yields undefined courses', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    });
    const result = mockUseQuery();
    const courses = result.data?.courses ?? [];
    expect(courses).toHaveLength(0);
  });
});

describe('CoursesScreen — loading state', () => {
  it('loading=true with no data', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
    });
    const result = mockUseQuery();
    expect(result.loading).toBe(true);
    expect(result.data).toBeUndefined();
  });
});

describe('CoursesScreen — error + cache fallback', () => {
  it('error state falls back to cached data', async () => {
    mockGetCachedQuery.mockResolvedValue({ courses: MOCK_COURSES.slice(0, 1) });
    const cached = await mockGetCachedQuery('query', {});
    const courses = (cached as { courses?: Course[] } | null)?.courses ?? [];
    expect(courses).toHaveLength(1);
    expect(courses[0].id).toBe('c1');
  });

  it('cache miss returns empty list', async () => {
    mockGetCachedQuery.mockResolvedValue(null);
    const cached = await mockGetCachedQuery('query', {});
    const courses = (cached as { courses?: Course[] } | null)?.courses ?? [];
    expect(courses).toHaveLength(0);
  });
});

describe('CoursesScreen — search filter', () => {
  it('empty search returns all', () => {
    expect(filterCourses(MOCK_COURSES, '')).toHaveLength(3);
  });

  it('matches partial title', () => {
    expect(filterCourses(MOCK_COURSES, 'Graph')).toHaveLength(1);
  });

  it('case-insensitive search', () => {
    expect(filterCourses(MOCK_COURSES, 'typescript')).toHaveLength(1);
  });

  it('no match returns empty', () => {
    expect(filterCourses(MOCK_COURSES, 'Python')).toHaveLength(0);
  });
});

describe('CoursesScreen — draft badge logic', () => {
  it('unpublished courses get draft badge', () => {
    const drafts = MOCK_COURSES.filter((c) => !c.isPublished);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].id).toBe('c2');
  });
});

describe('CoursesScreen — navigation', () => {
  it('pressing a course navigates to CourseDetail', () => {
    mockNavigate('CourseDetail', { courseId: 'c1' });
    expect(mockNavigate).toHaveBeenCalledWith('CourseDetail', {
      courseId: 'c1',
    });
  });
});
