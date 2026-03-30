import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { getCurrentUser, DEV_MODE } from '@/lib/auth';
import { COURSES_QUERY } from '@/lib/queries';
import {
  MY_ENROLLMENTS_QUERY,
  ENROLL_COURSE_MUTATION,
  UNENROLL_COURSE_MUTATION,
  PUBLISH_COURSE_MUTATION,
  UNPUBLISH_COURSE_MUTATION,
} from '@/lib/graphql/content.queries';
import { INSTRUCTOR_ROLES, MOCK_COURSES_FALLBACK } from './constants';
import type {
  CourseItem,
  CoursesQueryResult,
  MyEnrollmentsResult,
  UserEnrollment,
  SortOption,
  TabOption,
} from './types';

export function useCourseListData() {
  const location = useLocation();
  const user = getCurrentUser();
  const isInstructor = user ? INSTRUCTOR_ROLES.has(user.role) : false;

  // ── GraphQL queries & mutations ──────────────────────────
  const [{ data, fetching, error }, reexecuteCourses] =
    useQuery<CoursesQueryResult>({
      query: COURSES_QUERY,
      variables: { limit: 50, offset: 0 },
    });

  // GraphQL error logging moved to an effect to avoid logging on every render.
  // The error is still exposed via the return value for UI display.

  const [{ data: enrollmentsData }, reexecuteEnrollments] =
    useQuery<MyEnrollmentsResult>({
      query: MY_ENROLLMENTS_QUERY,
      pause: DEV_MODE,
    });

  const [, executeEnroll] = useMutation<
    { enrollCourse: UserEnrollment },
    { courseId: string }
  >(ENROLL_COURSE_MUTATION);

  const [, executeUnenroll] = useMutation<
    { unenrollCourse: boolean },
    { courseId: string }
  >(UNENROLL_COURSE_MUTATION);

  const [, executePublish] = useMutation<
    { publishCourse: { id: string; isPublished: boolean } },
    { id: string }
  >(PUBLISH_COURSE_MUTATION);

  const [, executeUnpublish] = useMutation<
    { unpublishCourse: { id: string; isPublished: boolean } },
    { id: string }
  >(UNPUBLISH_COURSE_MUTATION);

  // ── Local UI state ───────────────────────────────────────
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [activeTab, setActiveTab] = useState<TabOption>('all');
  const [localPublishState, setLocalPublishState] = useState<
    Map<string, boolean>
  >(new Map());
  const [toast, setToast] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Show success message from navigation state (CourseCreatePage, DeleteCourse, etc.)
  useEffect(() => {
    const state = location.state as { message?: string; deleted?: boolean } | null;
    if (state?.message) {
      showToast(state.message);
    }
    if (state?.message || state?.deleted) {
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3500);
  };

  const enrolledCourseIds = new Set(
    (enrollmentsData?.myEnrollments ?? [])
      .filter((e) => e.status === 'ACTIVE')
      .map((e) => e.courseId)
  );

  // ── Handlers ─────────────────────────────────────────────
  const handleEnroll = async (
    e: React.MouseEvent,
    courseId: string,
    title: string
  ) => {
    e.stopPropagation();
    const alreadyEnrolled = enrolledCourseIds.has(courseId);

    if (alreadyEnrolled) {
      const { error: unenrollError } = await executeUnenroll({ courseId });
      if (unenrollError) {
        showToast(
          `Failed to unenroll: ${unenrollError.graphQLErrors?.[0]?.message ?? unenrollError.message}`
        );
      } else {
        showToast(`Unenrolled from "${title}"`);
        reexecuteEnrollments({ requestPolicy: 'network-only' });
      }
    } else {
      const { error: enrollError } = await executeEnroll({ courseId });
      if (enrollError) {
        showToast(
          `Failed to enroll: ${enrollError.graphQLErrors?.[0]?.message ?? enrollError.message}`
        );
      } else {
        showToast(`Enrolled in "${title}"!`);
        reexecuteEnrollments({ requestPolicy: 'network-only' });
      }
    }
  };

  const togglePublish = async (
    e: React.MouseEvent,
    courseId: string,
    current: boolean
  ) => {
    e.stopPropagation();
    setLocalPublishState((prev) => new Map(prev).set(courseId, !current));
    const { error: pubError } = current
      ? await executeUnpublish({ id: courseId })
      : await executePublish({ id: courseId });
    if (pubError) {
      setLocalPublishState((prev) => new Map(prev).set(courseId, current));
      showToast(
        `Failed: ${pubError.graphQLErrors?.[0]?.message ?? pubError.message}`
      );
    } else {
      showToast(current ? 'Course unpublished' : 'Course published!');
    }
  };

  const isPublished = (course: CourseItem): boolean =>
    localPublishState.has(course.id)
      ? (localPublishState.get(course.id) as boolean)
      : course.isPublished;

  // ── Derived data ─────────────────────────────────────────
  const allCourses = useMemo(
    () => (error ? MOCK_COURSES_FALLBACK : (data?.courses ?? [])),
    [error, data]
  );

  const filteredCourses = useMemo(() => {
    const enrolledIds = new Set(
      (enrollmentsData?.myEnrollments ?? [])
        .filter((e) => e.status === 'ACTIVE')
        .map((e) => e.courseId)
    );
    let list = allCourses;
    if (!isInstructor && activeTab === 'enrolled') {
      list = list.filter((c) => enrolledIds.has(c.id));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      );
    }
    if (sort === 'title') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'duration') {
      list = [...list].sort(
        (a, b) => (b.estimatedHours ?? 0) - (a.estimatedHours ?? 0)
      );
    }
    return list;
  }, [allCourses, enrollmentsData, search, sort, activeTab, isInstructor]);

  return {
    user,
    isInstructor,
    fetching,
    error,
    reexecuteCourses,
    search,
    setSearch,
    sort,
    setSort,
    activeTab,
    setActiveTab,
    toast,
    aiModalOpen,
    setAiModalOpen,
    enrolledCourseIds,
    filteredCourses,
    handleEnroll,
    togglePublish,
    isPublished,
  };
}
