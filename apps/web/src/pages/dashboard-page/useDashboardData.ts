import { useQuery } from 'urql';
import { useState, useEffect, useRef } from 'react';
import { MY_ONBOARDING_STATE_QUERY } from '@/lib/graphql/onboarding.queries';
import { getCurrentUser, DEV_MODE } from '@/lib/auth';
import { MY_ENROLLMENTS_QUERY } from '@/lib/graphql/content.queries';
import {
  MY_IN_PROGRESS_COURSES_QUERY,
  MY_RECOMMENDED_COURSES_QUERY,
  MY_ACTIVITY_FEED_QUERY,
  MY_STATS_WITH_STREAK_QUERY,
  MY_TOP_MASTERY_TOPICS_QUERY,
} from '@/lib/graphql/dashboard.queries';
import type { MockCourse, MockActivity, MockMasteryItem } from './types';
import {
  MOCK_IN_PROGRESS,
  MOCK_RECOMMENDED,
  MOCK_ACTIVITY,
  MOCK_MASTERY,
  MOCK_STREAK,
  MOCK_COMPLETED,
} from './mock-data';

export function useDashboardData() {
  const user = getCurrentUser();
  const displayName = user?.firstName ?? (DEV_MODE ? 'Learner' : 'Learner');

  // Mounted guard: prevents urql cache dispatch during sibling render (BUG-052 pattern)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Onboarding banner state
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [{ data: onboardingData }] = useQuery({
    query: MY_ONBOARDING_STATE_QUERY,
    pause: !mounted,
  });

  const showOnboardingBanner = !onboardingDismissed
    && !!onboardingData?.myOnboardingState
    && !onboardingData.myOnboardingState.completed
    && !onboardingData.myOnboardingState.skipped;

  // Cleanup banner timer on unmount
  useEffect(() => {
    const timer = bannerTimerRef.current;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Real query: enrollments
  const [enrollmentsResult] = useQuery({
    query: MY_ENROLLMENTS_QUERY,
    pause: !mounted,
  });

  // Real queries — paused in DEV_MODE (no gateway) and until mounted (memory safety)
  const [inProgressResult] = useQuery({
    query: MY_IN_PROGRESS_COURSES_QUERY,
    variables: { limit: 5 },
    pause: !mounted || DEV_MODE,
  });

  const [recommendedResult] = useQuery({
    query: MY_RECOMMENDED_COURSES_QUERY,
    variables: { limit: 5 },
    pause: !mounted || DEV_MODE,
  });

  const [activityResult] = useQuery({
    query: MY_ACTIVITY_FEED_QUERY,
    variables: { limit: 10 },
    pause: !mounted || DEV_MODE,
  });

  const [statsResult] = useQuery({
    query: MY_STATS_WITH_STREAK_QUERY,
    pause: !mounted || DEV_MODE,
  });

  const [masteryResult] = useQuery({
    query: MY_TOP_MASTERY_TOPICS_QUERY,
    variables: { limit: 5 },
    pause: !mounted || DEV_MODE,
  });

  // Derive counts from real data; fall back to mock lengths if query hasn't resolved
  const enrolledCount =
    enrollmentsResult.data?.myEnrollments?.length ?? MOCK_IN_PROGRESS.length;
  const completedCount =
    enrollmentsResult.data?.myEnrollments?.filter(
      (e: { status: string }) => e.status === 'COMPLETED'
    ).length ?? MOCK_COMPLETED;

  // Derive display data — real data when available, mock fallback otherwise.
  // IMPORTANT: check .length, not just truthiness — an empty array [] is truthy
  // and would skip the fallback, rendering nothing (BUG-084).
  const rawInProgress = inProgressResult.data?.myInProgressCourses;
  const inProgressCourses: MockCourse[] = rawInProgress?.length
    ? rawInProgress.map(
        (c: { id: string; courseId: string; title: string; progress: number; lastAccessedAt: string | null; instructorName: string }) => ({
          id: c.id,
          title: c.title,
          progress: c.progress,
          lastStudied: c.lastAccessedAt ?? 'Unknown',
          instructor: c.instructorName,
        })
      )
    : MOCK_IN_PROGRESS;

  const rawRecommended = recommendedResult.data?.myRecommendedCourses;
  const recommendedCourses: MockCourse[] = rawRecommended?.length
    ? rawRecommended.map(
        (c: { courseId: string; title: string; instructorName: string; reason: string }) => ({
          id: c.courseId,
          title: c.title,
          progress: 0,
          lastStudied: 'Not started',
          instructor: c.instructorName,
        })
      )
    : MOCK_RECOMMENDED;

  const rawActivity = activityResult.data?.myActivityFeed;
  const activity: MockActivity[] = rawActivity?.length
    ? rawActivity.map(
        (a: { id: string; eventType: string; description: string; occurredAt: string }) => ({
          id: a.id,
          icon: a.eventType,
          action: a.description,
          timeAgo: a.occurredAt,
        })
      )
    : MOCK_ACTIVITY;

  const streak = statsResult.data?.myStats?.currentStreak ?? MOCK_STREAK;
  const xp = statsResult.data?.myStats?.totalXp ?? 0;
  const level = statsResult.data?.myStats?.level ?? 1;

  const rawMastery = masteryResult.data?.myTopMasteryTopics;
  const masteryTopics: MockMasteryItem[] = rawMastery?.length
    ? rawMastery.map(
        (t: { topicName: string; level: MockMasteryItem['level'] }) => ({
          topic: t.topicName,
          level: t.level,
        })
      )
    : MOCK_MASTERY;

  return {
    displayName,
    showOnboardingBanner,
    setOnboardingDismissed,
    enrolledCount,
    completedCount,
    inProgressCourses,
    recommendedCourses,
    activity,
    streak,
    xp,
    level,
    masteryTopics,
  };
}
