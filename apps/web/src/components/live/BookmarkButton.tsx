/**
 * BookmarkButton — bookmark the current stream moment.
 *
 * - Small icon button placed in LiveVideoPlayer control area
 * - Calls ADD_LIVE_BOOKMARK_MUTATION with current stream timestamp
 * - Shows filled bookmark icon + brief "Bookmarked!" tooltip after success
 * - Shows outline icon (unfilled) by default
 * - Queries existing bookmarks and shows filled if one is near current timestamp (±10s)
 */
import { useState, useCallback } from 'react';
import { Bookmark } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import {
  ADD_LIVE_BOOKMARK_MUTATION,
  LIVE_BOOKMARKS_QUERY,
} from '@/lib/graphql/live-chat.queries';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface BookmarkButtonProps {
  sessionId: string;
  /** Current stream position in milliseconds */
  currentTimestampMs: number;
  className?: string;
}

interface BookmarksQueryResult {
  liveBookmarks: Array<{
    id: string;
    streamTs: number;
    label: string | null;
  }>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BookmarkButton({
  sessionId,
  currentTimestampMs,
  className,
}: BookmarkButtonProps) {
  const [justBookmarked, setJustBookmarked] = useState(false);

  const [bookmarksResult] = useQuery<BookmarksQueryResult>({
    query: LIVE_BOOKMARKS_QUERY,
    variables: { sessionId },
    pause: !sessionId,
  });

  const [, executeAddBookmark] = useMutation(ADD_LIVE_BOOKMARK_MUTATION);

  // Check if already bookmarked within ±10s of current timestamp
  const THRESHOLD_MS = 10_000;
  const isNearBookmark = (bookmarksResult.data?.liveBookmarks ?? []).some(
    (b) => Math.abs(b.streamTs * 1000 - currentTimestampMs) < THRESHOLD_MS
  );

  const isBookmarked = justBookmarked || isNearBookmark;

  const handleBookmark = useCallback(async () => {
    if (justBookmarked) return;

    const totalSec = Math.floor(currentTimestampMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = String(totalSec % 60).padStart(2, '0');
    const label = `סימנייה ${mins}:${secs}`;

    const result = await executeAddBookmark({
      sessionId,
      label,
      streamTs: currentTimestampMs / 1000,
    });

    if (!result.error) {
      setJustBookmarked(true);
      setTimeout(() => setJustBookmarked(false), 3000);
    }
  }, [sessionId, currentTimestampMs, executeAddBookmark, justBookmarked]);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip open={justBookmarked || undefined}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => {
              void handleBookmark();
            }}
            className={cn(
              'flex items-center justify-center h-8 w-8 rounded-full',
              'bg-black/40 hover:bg-black/60 text-white transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
              isBookmarked && 'text-yellow-400',
              className
            )}
            aria-label={isBookmarked ? 'Bookmarked' : 'Bookmark this moment'}
            data-testid="bookmark-button"
          >
            <Bookmark
              className={cn('h-4 w-4', isBookmarked && 'fill-current')}
              aria-hidden="true"
            />
          </button>
        </TooltipTrigger>
        {justBookmarked && (
          <TooltipContent side="top" className="text-xs">
            !סומן בהצלחה
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
