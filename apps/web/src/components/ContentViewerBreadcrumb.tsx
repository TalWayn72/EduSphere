/**
 * ContentViewerBreadcrumb — shows Course → Module → Item breadcrumb
 * plus Prev / Next navigation buttons for ContentViewer.
 *
 * Requires ?courseId=<id> search param to be present in the URL (injected
 * by CourseDetailPage when navigating to a content item).  Gracefully
 * renders nothing when no course context is available (direct link).
 */
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useCourseNavigation } from '@/hooks/useCourseNavigation';

interface Props {
  contentId: string;
  /** Title displayed at the right-most breadcrumb segment */
  contentTitle: string;
}

export function ContentViewerBreadcrumb({ contentId, contentTitle }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get('courseId');

  const {
    courseId,
    courseTitle,
    moduleName,
    prevItemId,
    nextItemId,
    ready,
  } = useCourseNavigation(contentId);

  // Only render when we have course context from the URL param
  if (!ready || !courseIdParam || !courseId) return null;

  const buildLearnUrl = (itemId: string) => {
    const params = new URLSearchParams({ courseId });
    return `/learn/${itemId}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between gap-2 py-1 mb-2">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1 text-xs text-muted-foreground min-w-0 overflow-hidden"
        aria-label="breadcrumb"
      >
        <button
          onClick={() => navigate('/courses')}
          className="hover:text-foreground transition-colors shrink-0"
        >
          Courses
        </button>

        {courseTitle && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <button
              onClick={() => navigate(`/courses/${courseId}`)}
              className="hover:text-foreground transition-colors truncate max-w-[140px]"
              title={courseTitle}
            >
              {courseTitle}
            </button>
          </>
        )}

        {moduleName && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[120px]" title={moduleName}>
              {moduleName}
            </span>
          </>
        )}

        {contentTitle && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span
              className="truncate max-w-[140px] text-foreground font-medium"
              title={contentTitle}
            >
              {contentTitle}
            </span>
          </>
        )}
      </nav>

      {/* Prev / Next */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1 text-xs"
          disabled={!prevItemId}
          onClick={() => prevItemId && navigate(buildLearnUrl(prevItemId))}
          title="Previous item"
        >
          <ChevronLeft className="h-3 w-3" />
          Prev
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1 text-xs"
          disabled={!nextItemId}
          onClick={() => nextItemId && navigate(buildLearnUrl(nextItemId))}
          title="Next item"
        >
          Next
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
