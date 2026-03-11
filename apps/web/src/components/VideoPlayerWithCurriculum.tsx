/**
 * VideoPlayerWithCurriculum — video player with persistent collapsible curriculum sidebar.
 *
 * Key UX insight (Udemy 2024 research): removing the curriculum sidebar caused a user revolt.
 * Keep it visible by default; allow collapsing but never remove.
 *
 * Layout: flex row — video area (flex-1) | curriculum sidebar (320px, collapsible to 0).
 */
import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CurriculumLesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
}

interface CurriculumSection {
  sectionTitle: string;
  lessons: CurriculumLesson[];
}

export interface VideoPlayerWithCurriculumProps {
  courseTitle: string;
  currentLessonId: string;
  videoUrl: string;
  curriculum: CurriculumSection[];
  onLessonSelect: (lessonId: string) => void;
  /**
   * Pre-signed MinIO URL to a WebVTT captions file.
   * When provided, a <track> element is added (WCAG 1.2.2) and a CC toggle
   * button appears in the player controls.
   */
  captionsUrl?: string;
  /** BCP-47 language tag for the captions track (default: "en"). */
  captionsLang?: string;
  /** Human-readable label for the captions track (default: "English"). */
  captionsLabel?: string;
}

// Flat list of all lessons across all sections for prev/next navigation
function flatLessons(curriculum: CurriculumSection[]): CurriculumLesson[] {
  return curriculum.flatMap((s) => s.lessons);
}

function completedCount(curriculum: CurriculumSection[]): number {
  return curriculum.reduce((acc, s) => acc + s.lessons.filter((l) => l.completed).length, 0);
}

function totalCount(curriculum: CurriculumSection[]): number {
  return curriculum.reduce((acc, s) => acc + s.lessons.length, 0);
}

export function VideoPlayerWithCurriculum({
  courseTitle,
  currentLessonId,
  videoUrl,
  curriculum,
  onLessonSelect,
  captionsUrl,
  captionsLang = 'en',
  captionsLabel = 'English',
}: VideoPlayerWithCurriculumProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const trackRef = useRef<HTMLTrackElement>(null);

  const toggleCaptions = useCallback(() => {
    setCaptionsEnabled((prev) => {
      const next = !prev;
      // trackRef.current.track may be undefined in environments that do not
      // implement the TextTrack API (e.g. jsdom in tests).
      if (trackRef.current?.track) {
        trackRef.current.track.mode = next ? 'showing' : 'hidden';
      }
      return next;
    });
  }, []);

  const all = flatLessons(curriculum);
  const currentIndex = all.findIndex((l) => l.id === currentLessonId);
  const prevLesson = currentIndex > 0 ? all[currentIndex - 1] : null;
  const nextLesson = currentIndex < all.length - 1 ? all[currentIndex + 1] : null;

  const currentLesson = all[currentIndex] ?? null;
  const done = completedCount(curriculum);
  const total = totalCount(curriculum);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background" data-testid="video-player-container">
      {/* ── Left: video area ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto" data-testid="video-player">
        {/* Video */}
        <div className="relative w-full bg-black aspect-video">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              className="w-full h-full"
              data-testid="video-element"
              crossOrigin={captionsUrl ? 'anonymous' : undefined}
            >
              {captionsUrl && (
                <track
                  ref={trackRef}
                  kind="captions"
                  src={captionsUrl}
                  srcLang={captionsLang}
                  label={captionsLabel}
                  default
                  data-testid="captions-track"
                />
              )}
            </video>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white/50 text-sm"
              data-testid="video-placeholder"
            >
              [Video preview unavailable in development mode]
            </div>
          )}
        </div>

        {/* Caption controls — only shown when captionsUrl is provided */}
        {captionsUrl && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
            <button
              onClick={toggleCaptions}
              aria-label="Toggle captions"
              aria-pressed={captionsEnabled}
              data-testid="cc-toggle-btn"
              className={cn(
                'flex items-center justify-center px-2 py-1 rounded text-xs font-bold border transition-colors',
                captionsEnabled
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:bg-muted'
              )}
            >
              CC
            </button>
            <span className="text-xs text-muted-foreground">
              {captionsEnabled ? 'Captions on' : 'Captions off'}
            </span>
          </div>
        )}

        {/* Lesson info */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground" data-testid="lesson-title">
            {currentLesson?.title ?? 'No lesson selected'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1" data-testid="lesson-description">
            {currentLesson?.duration ? `Duration: ${currentLesson.duration}` : ''}
          </p>
        </div>

        {/* Prev / Next navigation */}
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => prevLesson && onLessonSelect(prevLesson.id)}
            disabled={!prevLesson}
            className={cn(
              'flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium border transition-colors',
              prevLesson
                ? 'border-border hover:bg-muted text-foreground'
                : 'border-border/40 text-muted-foreground cursor-not-allowed opacity-50'
            )}
            data-testid="prev-lesson-btn"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous
          </button>
          <button
            onClick={() => nextLesson && onLessonSelect(nextLesson.id)}
            disabled={!nextLesson}
            className={cn(
              'flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium border transition-colors',
              nextLesson
                ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-border/40 text-muted-foreground cursor-not-allowed opacity-50'
            )}
            data-testid="next-lesson-btn"
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Toggle button on the border ──────────────────────────────────── */}
      <button
        onClick={() => setSidebarOpen((o) => !o)}
        className={cn(
          'flex-shrink-0 self-start mt-4 z-10 w-5 flex items-center justify-center py-6 bg-muted',
          'border border-border rounded-sm text-muted-foreground hover:bg-muted/80 transition-colors'
        )}
        aria-label={sidebarOpen ? 'Collapse curriculum' : 'Expand curriculum'}
        data-testid="sidebar-toggle"
      >
        {sidebarOpen ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* ── Right: curriculum sidebar ────────────────────────────────────── */}
      <div
        className={cn(
          'flex flex-col flex-shrink-0 overflow-hidden border-l border-border bg-card transition-all duration-200',
          sidebarOpen ? 'w-80' : 'w-0'
        )}
        data-testid="curriculum-sidebar"
        aria-hidden={!sidebarOpen}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <h3 className="font-semibold text-foreground text-sm leading-tight" data-testid="course-title">
            {courseTitle}
          </h3>
          <p className="text-xs text-muted-foreground mt-1" data-testid="progress-count">
            {done} of {total} lessons completed
          </p>
        </div>

        {/* Scrollable lesson list */}
        <div className="flex-1 overflow-y-auto">
          {curriculum.map((section, si) => (
            <div key={si}>
              <div className="px-4 py-2 bg-muted/40 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {section.sectionTitle}
                </p>
              </div>
              {section.lessons.map((lesson) => {
                const isCurrent = lesson.id === currentLessonId;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => onLessonSelect(lesson.id)}
                    className={cn(
                      'w-full flex items-start gap-2 px-4 py-3 text-left transition-colors border-b border-border/50',
                      'hover:bg-muted/60',
                      isCurrent && 'border-l-2 border-l-indigo-500 bg-indigo-50/60'
                    )}
                    data-testid={`lesson-item-${lesson.id}`}
                  >
                    <span className="mt-0.5 flex-shrink-0 text-muted-foreground" data-testid={lesson.completed ? 'lesson-completed-icon' : 'lesson-incomplete-icon'}>
                      {lesson.completed
                        ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                        : <Circle className="h-4 w-4" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={cn('text-sm leading-tight block', isCurrent && 'font-medium text-indigo-700')}>
                        {lesson.title}
                      </span>
                      <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
