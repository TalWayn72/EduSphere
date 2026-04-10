import { useState, useEffect, useDeferredValue } from 'react';
import { useQuery } from 'urql';
import { getCurrentUser } from '@/lib/auth';
import { ME_QUERY, COURSES_QUERY, MY_STATS_QUERY } from '@/lib/queries';
import { MY_ANNOTATIONS_QUERY } from '@/lib/graphql/annotation.queries';
import { MY_DISCUSSIONS_QUERY } from '@/lib/graphql/collaboration.queries';
import { MOCK_STATS } from '@/lib/mock-analytics';
import type {
  MeQueryResult,
  CoursesQueryResult,
  MyAnnotationsQueryResult,
  MyStatsQueryResult,
} from './Dashboard.types';

interface MyDiscussionsResult {
  myDiscussions: { id: string; discussionType: string }[];
}

export function useDashboardQueries() {
  const localUser = getCurrentUser();

  // Mounted guard: prevent urql cache dispatch during sibling route render
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [meResult] = useQuery<MeQueryResult>({
    query: ME_QUERY,
    pause: !mounted,
  });
  const [coursesResult] = useQuery<CoursesQueryResult>({
    query: COURSES_QUERY,
    variables: { limit: 100, offset: 0 },
    pause: !mounted,
  });

  const currentUserId = meResult.data?.me?.id;
  const [annotationsResult] = useQuery<MyAnnotationsQueryResult>({
    query: MY_ANNOTATIONS_QUERY,
    variables: { userId: currentUserId, limit: 500, offset: 0 },
    pause: !mounted || !currentUserId,
  });

  const [statsResult] = useQuery<MyStatsQueryResult>({
    query: MY_STATS_QUERY,
    pause: !mounted,
  });
  const myStats = statsResult.data?.myStats;

  const [discussionsResult] = useQuery<MyDiscussionsResult>({
    query: MY_DISCUSSIONS_QUERY,
    variables: { limit: 100, offset: 0 },
    pause: !mounted,
  });

  // --- Derived stats ---
  const coursesEnrolled =
    statsResult.fetching && coursesResult.fetching
      ? null
      : (myStats?.coursesEnrolled ??
        coursesResult.data?.courses?.length ??
        MOCK_STATS.coursesEnrolled);

  const annotationsCreated =
    statsResult.fetching && annotationsResult.fetching
      ? null
      : (myStats?.annotationsCreated ??
        annotationsResult.data?.annotationsByUser?.length ??
        MOCK_STATS.annotationsCreated);

  const totalLearningMinutes =
    myStats?.totalLearningMinutes ?? MOCK_STATS.totalLearningMinutes;
  const totalMinutesDisplay =
    totalLearningMinutes >= 60
      ? `${Math.floor(totalLearningMinutes / 60)}h ${totalLearningMinutes % 60}m`
      : `${totalLearningMinutes}m`;

  const conceptsMastered =
    myStats?.conceptsMastered ?? MOCK_STATS.conceptsMastered;

  const weeklyActivity = myStats?.weeklyActivity ?? MOCK_STATS.weeklyActivity;
  const deferredActivity = useDeferredValue(weeklyActivity);

  const firstName = meResult.data?.me?.firstName ?? localUser?.firstName;

  // Study groups = CHAVRUTA discussions
  const studyGroupsCount = discussionsResult.fetching
    ? null
    : (discussionsResult.data?.myDiscussions?.filter(
        (d) => d.discussionType === 'CHAVRUTA'
      ).length ?? 0);

  return {
    localUser,
    meResult,
    statsResult,
    coursesEnrolled,
    annotationsCreated,
    studyGroupsCount,
    totalMinutesDisplay,
    conceptsMastered,
    deferredActivity,
    firstName,
  };
}
