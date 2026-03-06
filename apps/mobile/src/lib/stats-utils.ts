/**
 * stats-utils — pure logic for HomeScreen stats resolution.
 * No React Native imports — safe to import in unit tests without StyleSheet.
 */

export interface ApiStats {
  coursesEnrolled?: number;
  conceptsMastered?: number;
  totalLearningMinutes?: number;
}

export interface ResolvedStats {
  activeCourses: number;
  learningStreak: number;
  studyTimeMinutes: number;
  conceptsMastered: number;
}

/**
 * Resolve stats: use real API data when available, fall back to mock.
 * learningStreak is not present in UserStats schema — always from mock.
 */
export function resolveStats(
  loading: boolean,
  apiStats: ApiStats | undefined,
  mockStats: ResolvedStats
): ResolvedStats {
  if (!loading && apiStats) {
    return {
      activeCourses: apiStats.coursesEnrolled ?? mockStats.activeCourses,
      learningStreak: mockStats.learningStreak, // not in UserStats schema
      studyTimeMinutes: apiStats.totalLearningMinutes ?? mockStats.studyTimeMinutes,
      conceptsMastered: apiStats.conceptsMastered ?? mockStats.conceptsMastered,
    };
  }
  return mockStats;
}
