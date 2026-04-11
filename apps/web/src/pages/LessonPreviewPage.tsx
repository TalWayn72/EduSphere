/**
 * LessonPreviewPage — read-only student preview of a lesson.
 * Route: /courses/:courseId/lessons/:lessonId/preview
 *
 * Shows lesson content (title, assets, enriched blocks, YouTube video)
 * with a sticky preview banner. Hides all edit/mutation buttons.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LESSON_QUERY } from '@/lib/graphql/lesson.queries';
import { ENRICHED_LESSON_QUERY } from '@/lib/graphql/enriched-lesson.queries';
import { EnrichedBlocksSection, YouTubeEmbed } from './lesson-preview/EnrichedBlocksSection';
import type { EnrichedTranscriptBlock } from '@/components/enriched-transcript/enriched-transcript.types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface LessonPreviewData {
  lesson: {
    id: string;
    title: string;
    type: string;
    series?: string;
    lessonDate?: string;
    status: string;
    assets: Array<{
      id: string;
      assetType: string;
      sourceUrl?: string;
      fileUrl?: string;
    }>;
    pipeline?: {
      id: string;
      status: string;
      currentRun?: {
        results: Array<{
          id: string;
          moduleName: string;
          outputType: string;
          outputData?: Record<string, unknown> | null;
          fileUrl?: string | null;
        }>;
      } | null;
    } | null;
  } | null;
}

interface EnrichedLessonPreviewData {
  enrichedLesson: {
    id: string;
    youtubeVideoId?: string | null;
    transcriptReady: boolean;
    enrichmentStatus: string;
    blocks: EnrichedTranscriptBlock[];
  } | null;
}

const ASSET_ICONS: Record<string, string> = {
  VIDEO: '🎥',
  AUDIO: '🎙️',
  NOTES: '📄',
  WHITEBOARD: '📋',
};

function PreviewBanner({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="sticky top-0 z-50 bg-amber-500 text-foreground dark:text-foreground px-6 py-2 flex items-center justify-between dark:bg-amber-600"
      role="banner"
      aria-label="מצב תצוגה מקדימה"
    >
      <span className="font-semibold text-sm">
        תצוגה מקדימה — כך יראו התלמידים את השיעור
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="text-foreground dark:text-foreground hover:bg-amber-600"
        aria-label="סגור תצוגה מקדימה"
      >
        ✕ סגור
      </Button>
    </div>
  );
}

export function LessonPreviewPage() {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();
  const navigate = useNavigate();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isValidId = lessonId ? UUID_RE.test(lessonId) : false;
  const pause = !mounted || !lessonId || !isValidId;

  const [{ data, fetching, error }] = useQuery<LessonPreviewData>({
    query: LESSON_QUERY,
    variables: { id: lessonId },
    pause,
  });

  const [{ data: enrichedData, fetching: enrichedFetching }] =
    useQuery<EnrichedLessonPreviewData>({
      query: ENRICHED_LESSON_QUERY,
      variables: { lessonId },
      pause,
    });

  if (!mounted || fetching || enrichedFetching) {
    return (
      <Layout>
        <PreviewBanner onClose={() => navigate(-1)} />
        <PageShell size="sm" className="max-w-3xl p-6">
          <Skeleton className="h-8 w-2/3 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-24 w-full" />
        </PageShell>
      </Layout>
    );
  }

  if (!isValidId || error || !data?.lesson) {
    return (
      <Layout>
        <PreviewBanner onClose={() => navigate(-1)} />
        <PageShell size="sm" className="max-w-3xl p-6">
          <p className="text-muted-foreground">
            {error ? 'שגיאה בטעינת השיעור.' : 'השיעור לא נמצא.'}
          </p>
        </PageShell>
      </Layout>
    );
  }

  const lesson = data.lesson;
  const enriched = enrichedData?.enrichedLesson;
  const enrichedBlocks = enriched?.blocks ?? [];
  const hasEnrichedBlocks =
    enrichedBlocks.length > 0 &&
    (enriched?.enrichmentStatus === 'READY' ||
      enriched?.enrichmentStatus === 'PUBLISHED');

  // Extract YouTube video ID: prefer enrichedLesson field, fall back to asset sourceUrl
  function extractYouTubeId(url: string): string | null {
    const match =
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(
        url
      );
    return match?.[1] ?? null;
  }
  const youtubeVideoIdFromAssets = lesson.assets
    .map((a) => (a.sourceUrl ? extractYouTubeId(a.sourceUrl) : null))
    .find(Boolean) ?? null;
  const youtubeVideoId = enriched?.youtubeVideoId ?? youtubeVideoIdFromAssets;
  const pipelineResults = lesson.pipeline?.currentRun?.results ?? [];
  const hasContent = hasEnrichedBlocks || pipelineResults.length > 0;

  return (
    <Layout>
      <PreviewBanner
        onClose={() => navigate(`/courses/${courseId}/lessons/${lessonId}`)}
      />
      <PageShell size="sm" className="max-w-3xl p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{lesson.title}</h1>
          <div className="flex gap-3 text-sm text-muted-foreground">
            <span>סוג: {lesson.type === 'THEMATIC' ? 'הגות' : 'על הסדר'}</span>
            {lesson.series && <span>סדרה: {lesson.series}</span>}
            {lesson.lessonDate && (
              <span>
                תאריך: {new Date(lesson.lessonDate).toLocaleDateString('he-IL')}
              </span>
            )}
          </div>
        </header>

        {youtubeVideoId && <YouTubeEmbed videoId={youtubeVideoId} />}

        {lesson.assets.length > 0 && (
          <section
            className="bg-card rounded-xl border p-4 mb-4"
            aria-labelledby="assets-heading"
          >
            <h2 id="assets-heading" className="text-base font-semibold mb-3">
              חומרי שיעור
            </h2>
            <div className="space-y-2">
              {lesson.assets.map((asset) => (
                <div key={asset.id} className="flex items-center gap-2 text-sm">
                  <span>{ASSET_ICONS[asset.assetType] ?? '📁'}</span>
                  <span className="font-medium">{asset.assetType}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {hasEnrichedBlocks && (
          <div className="mb-4">
            <EnrichedBlocksSection blocks={enrichedBlocks} />
          </div>
        )}

        {!hasEnrichedBlocks && pipelineResults.length > 0 && (
          <section className="space-y-4" aria-labelledby="results-heading">
            <h2 id="results-heading" className="text-lg font-semibold">
              תוצרי השיעור
            </h2>
            {pipelineResults.map((result) => (
              <article
                key={result.id}
                className="bg-card rounded-xl border p-4"
              >
                <h3 className="text-sm font-semibold mb-2">
                  {result.moduleName}
                </h3>
                {result.outputData && (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">
                    {typeof result.outputData === 'object'
                      ? JSON.stringify(result.outputData, null, 2)
                      : String(result.outputData)}
                  </div>
                )}
                {result.fileUrl && (
                  <a
                    href={result.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 text-sm underline mt-2 inline-block dark:text-blue-400"
                  >
                    פתח קובץ
                  </a>
                )}
              </article>
            ))}
          </section>
        )}

        {!hasContent && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-1">אין עדיין תוצרים לשיעור זה</p>
            <p className="text-sm">יש להריץ את ה-Pipeline כדי ליצור תוכן.</p>
          </div>
        )}
      </PageShell>
    </Layout>
  );
}
