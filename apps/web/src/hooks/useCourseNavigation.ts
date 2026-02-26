/**
 * useCourseNavigation — derives breadcrumb context and prev/next item links.
 *
 * Strategy:
 *  1. If `?courseId=<id>` is present in the URL (set when navigating from
 *     CourseDetailPage), use that courseId directly — no extra round-trip.
 *  2. Fall back to fetching the course via contentItem.course.id if the
 *     GraphQL schema supports it.
 *  3. Degrades gracefully when no course context is available (direct link).
 */
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'urql';
import { COURSE_DETAIL_QUERY } from '@/lib/graphql/content.queries';

interface ContentItemSummary {
  id: string;
  title: string;
  contentType: string;
  duration: number | null;
  orderIndex: number;
}

interface ModuleSummary {
  id: string;
  title: string;
  orderIndex: number;
  contentItems: ContentItemSummary[];
}

export interface CourseNavContext {
  courseId: string | null;
  courseTitle: string | null;
  moduleName: string | null;
  prevItemId: string | null;
  nextItemId: string | null;
  ready: boolean;
}

interface CourseDetailResult {
  course?: {
    id: string;
    title: string;
    modules: ModuleSummary[];
  } | null;
}

export function useCourseNavigation(contentId: string): CourseNavContext {
  const [searchParams] = useSearchParams();
  const courseIdHint = searchParams.get('courseId');

  const [courseResult] = useQuery<CourseDetailResult>({
    query: COURSE_DETAIL_QUERY,
    variables: { id: courseIdHint },
    pause: !courseIdHint,
    requestPolicy: 'network-only', // avoid synchronous cache read that triggers setState-during-render
  });

  const course = courseResult.data?.course;

  if (!course || !courseIdHint) {
    return {
      courseId: null,
      courseTitle: null,
      moduleName: null,
      prevItemId: null,
      nextItemId: null,
      ready: !courseResult.fetching,
    };
  }

  // Flatten all items across modules in sorted order
  const sortedModules = [...course.modules].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );
  const flatItems: Array<{ itemId: string; moduleTitle: string }> = [];

  for (const mod of sortedModules) {
    const sorted = [...mod.contentItems].sort(
      (a, b) => a.orderIndex - b.orderIndex
    );
    for (const item of sorted) {
      flatItems.push({ itemId: item.id, moduleTitle: mod.title });
    }
  }

  const idx = flatItems.findIndex((f) => f.itemId === contentId);

  return {
    courseId: course.id,
    courseTitle: course.title,
    moduleName: idx >= 0 ? (flatItems[idx]?.moduleTitle ?? null) : null,
    prevItemId: idx > 0 ? (flatItems[idx - 1]?.itemId ?? null) : null,
    nextItemId:
      idx >= 0 && idx < flatItems.length - 1
        ? (flatItems[idx + 1]?.itemId ?? null)
        : null,
    ready: true,
  };
}
