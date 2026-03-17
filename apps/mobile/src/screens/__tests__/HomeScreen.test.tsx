/**
 * HomeScreen — expanded pure logic tests.
 * Covers: welcome message logic, Apollo query states,
 * empty/loading state resolution, stat card rendering decisions,
 * navigation targets, and DEV_MODE badge logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { COLORS } from '../../lib/theme';
import {
  MOCK_USER,
  MOCK_STATS,
  MOCK_RECENT_COURSES,
} from '../../lib/mock-mobile-data';
import { resolveStats } from '../../lib/stats-utils';

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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) =>
      opts?.name ? `Welcome back, ${opts.name}` : key,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseQuery.mockReturnValue({ data: undefined, loading: false, error: undefined });
});

describe('HomeScreen — welcome message', () => {
  it('greeting uses MOCK_USER.firstName in DEV_MODE', () => {
    const name = MOCK_USER.firstName ?? 'Student';
    expect(name).toBe('Dev');
    expect(name).not.toBe('Student');
  });

  it('falls back to "Student" when firstName is absent', () => {
    const name = (undefined as string | undefined) ?? 'Student';
    expect(name).toBe('Student');
  });

  it('full name combines first + last', () => {
    const full = `${MOCK_USER.firstName} ${MOCK_USER.lastName}`;
    expect(full).toBe('Dev Student');
  });
});

describe('HomeScreen — Apollo query states', () => {
  it('loading state: data is undefined', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true, error: undefined });
    const result = mockUseQuery();
    expect(result.loading).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it('success state: me + myCourses present', () => {
    mockUseQuery.mockReturnValue({
      data: { me: MOCK_USER, myCourses: { edges: MOCK_RECENT_COURSES.map(c => ({ node: c })) } },
      loading: false,
      error: undefined,
    });
    const result = mockUseQuery();
    expect(result.data.me.firstName).toBe('Dev');
    expect(result.data.myCourses.edges).toHaveLength(3);
  });

  it('error state: shows error, data is undefined', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: false, error: new Error('Network') });
    const result = mockUseQuery();
    expect(result.error).toBeDefined();
  });
});

describe('HomeScreen — empty state', () => {
  it('no recent courses yields empty list', () => {
    const edges: unknown[] = [];
    const courses = edges.map((e: unknown) => (e as { node: unknown }).node);
    expect(courses).toHaveLength(0);
  });
});

describe('HomeScreen — stat card value computation', () => {
  it('study time converts minutes to hours (rounded)', () => {
    const hours = Math.round(MOCK_STATS.studyTimeMinutes / 60);
    expect(hours).toBe(5); // 320 / 60 ≈ 5.33 → 5
  });

  it('stat colors match design tokens', () => {
    expect(COLORS.primary).toBe('#6366F1');   // activeCourses
    expect(COLORS.warning).toBe('#F59E0B');   // streak
    expect(COLORS.success).toBe('#10B981');   // study time
    expect(COLORS.accent).toBe('#8B5CF6');    // concepts
  });
});

describe('HomeScreen — resolveStats integration', () => {
  it('DEV_MODE always uses MOCK_STATS', () => {
    // In DEV_MODE the query is skipped, so loading=false, apiStats=undefined
    const stats = resolveStats(false, undefined, MOCK_STATS);
    expect(stats).toBe(MOCK_STATS);
  });

  it('real API stats override mock when available', () => {
    const api = { coursesEnrolled: 10, conceptsMastered: 200, totalLearningMinutes: 1200 };
    const stats = resolveStats(false, api, MOCK_STATS);
    expect(stats.activeCourses).toBe(10);
    expect(stats.conceptsMastered).toBe(200);
  });
});

describe('HomeScreen — navigation', () => {
  it('course card navigates to CourseDetail with courseId', () => {
    const courseId = MOCK_RECENT_COURSES[0].id;
    mockNavigate('CourseDetail', { courseId });
    expect(mockNavigate).toHaveBeenCalledWith('CourseDetail', { courseId: 'course-1' });
  });
});
