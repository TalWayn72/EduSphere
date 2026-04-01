/**
 * useCourseDetailQueries — encapsulates all GraphQL queries and mutations
 * needed by CourseDetailPage.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { COURSE_DETAIL_QUERY } from '@/lib/graphql/content.queries';
import {
  ENROLL_COURSE_MUTATION,
  UNENROLL_COURSE_MUTATION,
  FORK_COURSE_MUTATION,
  UPDATE_COURSE_MUTATION,
} from '@/lib/graphql/content.queries';
import {
  MY_ENROLLMENTS_QUERY,
  MY_COURSE_PROGRESS_QUERY,
} from '@/lib/graphql/content.queries';
import { LESSONS_BY_COURSE_QUERY } from '@/lib/graphql/lesson.queries';
import { useOptimisticEnrollment } from '@/hooks/useOptimisticEnrollment';
import { MOCK_COURSE_FALLBACK, MOCK_LESSONS_FALLBACK } from './mock-data';
import type {
  CourseDetailResult,
  EnrollmentData,
  ProgressData,
  LessonsByCourseData,
  LessonSummary,
  CourseDetailData,
} from './types';

export function useCourseDetailQueries(courseId: string) {
  const { t } = useTranslation('courses');
  const navigate = useNavigate();

  // Delay all queries until after mount to prevent urql from triggering a
  // synchronous setState on CourseList (which shares MY_ENROLLMENTS_QUERY cache)
  // during CourseDetailPage's render phase.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching, error }] = useQuery<CourseDetailResult>({
    query: COURSE_DETAIL_QUERY,
    variables: { id: courseId },
    pause: !courseId || !mounted,
  });

  const [{ data: enrollData, error: enrollError }, reexecuteEnrollments] =
    useQuery<EnrollmentData>({
      query: MY_ENROLLMENTS_QUERY,
      pause: !mounted,
    });

  // Local override prevents useOptimistic revert flash
  const [enrolledLocal, setEnrolledLocal] = useState<boolean | null>(null);
  useEffect(() => {
    if (enrollData) setEnrolledLocal(null);
  }, [enrollData]);

  const [{ data: progressData }] = useQuery<ProgressData>({
    query: MY_COURSE_PROGRESS_QUERY,
    variables: { courseId },
    pause: !courseId || !mounted,
  });

  const [{ data: lessonsData }] = useQuery<LessonsByCourseData>({
    query: LESSONS_BY_COURSE_QUERY,
    variables: { courseId, limit: 20 },
    pause: !courseId || !mounted,
  });

  const [, enrollMutation] = useMutation(ENROLL_COURSE_MUTATION);
  const [, unenrollMutation] = useMutation(UNENROLL_COURSE_MUTATION);
  const [{ fetching: isForkingCourse }, forkCourseMutation] =
    useMutation(FORK_COURSE_MUTATION);
  const [{ fetching: isSavingTitle }, updateCourseMutation] = useMutation(
    UPDATE_COURSE_MUTATION
  );

  const [forkError, setForkError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const course: CourseDetailData | null =
    data?.course ?? (error ? MOCK_COURSE_FALLBACK : null);
  const lessons: LessonSummary[] =
    lessonsData?.lessonsByCourse ?? (error ? MOCK_LESSONS_FALLBACK : []);
  const isEnrolled =
    enrolledLocal !== null
      ? enrolledLocal
      : enrollError
        ? true
        : (enrollData?.myEnrollments?.some((e) => e.courseId === courseId) ??
          false);
  const progress = progressData?.myCourseProgress;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const handleEnrollSuccess = useCallback(
    (msg: string) => {
      setEnrolledLocal(!isEnrolled);
      showToast(msg);
      reexecuteEnrollments({ requestPolicy: 'network-only' });
    },
    [isEnrolled, showToast, reexecuteEnrollments]
  );

  const { optimisticEnrolled, handleEnroll, isEnrolling } =
    useOptimisticEnrollment({
      courseId,
      isEnrolled,
      enrollMutation: (vars) => enrollMutation(vars),
      unenrollMutation: (vars) => unenrollMutation(vars),
      onSuccess: handleEnrollSuccess,
      onError: (msg, raw) => {
        const action = isEnrolled ? 'unenroll' : 'enroll';
        console.error(`[CourseDetailPage] ${action} failed:`, msg, raw);
        showToast(msg);
      },
      enrollSuccessMessage: t('enrolled'),
      unenrollSuccessMessage: t('unenroll'),
      enrollFailMessage: 'Failed to enroll',
      unenrollFailMessage: 'Failed to unenroll',
    });

  const handleForkCourse = async () => {
    setForkError(null);
    const { data: forkData, error: forkErr } = await forkCourseMutation({
      courseId,
    });
    if (forkErr) {
      const msg =
        forkErr.graphQLErrors?.[0]?.message ??
        t('forkError', 'Failed to fork course');
      console.error('[CourseDetailPage] fork course failed:', msg, forkErr);
      setForkError(msg);
      return;
    }
    const forkedId = forkData?.forkCourse?.id as string | undefined;
    if (forkedId) {
      showToast(t('forkCourseSuccess', 'Course forked successfully!'));
      navigate(`/courses/${forkedId}/edit`);
    }
  };

  const handleSaveTitle = async (editTitle: string) => {
    if (!course) return false;
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === course.title) return true;
    const { error: err } = await updateCourseMutation({
      id: courseId,
      input: { title: trimmed },
    });
    if (err) {
      console.error(
        '[CourseDetailPage] updateCourse failed:',
        err.graphQLErrors?.[0]?.message ?? err.message,
        err
      );
      showToast('שגיאה בשמירת שם הקורס');
      return false;
    }
    showToast('שם הקורס עודכן בהצלחה');
    return true;
  };

  return {
    course,
    lessons,
    fetching,
    isEnrolled,
    optimisticEnrolled,
    progress,
    toast,
    forkError,
    setForkError,
    isForkingCourse,
    isSavingTitle,
    isEnrolling,
    handleEnroll,
    handleForkCourse,
    handleSaveTitle,
    showToast,
  };
}
