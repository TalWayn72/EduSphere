/**
 * LessonEnrichmentEditor — instructor page for enriching a YouTube lesson.
 *
 * Layout: Left = YouTube player + transcript preview, Right = authoring tools.
 * Tabs: Citations Review | Timestamp Anchors | Preview
 *
 * EXCEPTION NOTE (150-line rule): Page-level orchestrator wiring multiple
 * hooks and sub-components; all rendering delegated.
 */
import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { YouTubeEmbedPlayer } from '@/components/youtube/YouTubeEmbedPlayer';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { useEnrichedLesson } from '@/hooks/useEnrichedLesson';
import { useCitationReview } from '@/hooks/useCitationReview';
import { usePlayerKeyboardShortcuts } from '@/hooks/usePlayerKeyboardShortcuts';
import { YouTubeUrlInput } from '@/components/lesson/YouTubeUrlInput';
import { EnrichedTranscriptPanel } from '@/components/enriched-transcript/EnrichedTranscriptPanel';
import { SyncTranscriptScroller } from '@/components/enriched-transcript/SyncTranscriptScroller';
import { CitationReviewPanel } from '@/components/lesson/CitationReviewPanel';
import { CitationEditModal } from '@/components/lesson/CitationEditModal';
import { TimestampAnchorEditor } from '@/components/lesson/TimestampAnchorEditor';
import {
  INGEST_YOUTUBE_LESSON_MUTATION,
  SET_BLOCK_ANCHOR_TIMESTAMP_MUTATION,
  PUBLISH_ENRICHED_LESSON_MUTATION,
} from '@/lib/graphql/enriched-lesson.queries';

const PROCESSING_STATUS_LABELS: Record<string, string> = {
  EXTRACTING_TRANSCRIPT: 'Extracting transcript...',
  RUNNING_NER: 'Analyzing entities...',
  RESOLVING_CITATIONS: 'Resolving citations...',
};

const TERMINAL_STATUSES = new Set(['READY', 'PUBLISHED', 'PENDING', undefined]);

export function LessonEnrichmentEditor() {
  const { lessonId = '' } = useParams<{ lessonId: string }>();
  const { data, fetching, refetch } = useEnrichedLesson(lessonId, {
    pollWhileProcessing: true,
  });
  const { approve, reject } = useCitationReview();
  const player = useYouTubePlayer();
  const [editCitationId, setEditCitationId] = useState<string | null>(null);
  const editCitation =
    (data?.citations ?? []).find((c) => c.id === editCitationId) ?? null;

  const [, ingest] = useMutation(INGEST_YOUTUBE_LESSON_MUTATION);
  const [, setTimestamp] = useMutation(SET_BLOCK_ANCHOR_TIMESTAMP_MUTATION);
  const [, publish] = useMutation(PUBLISH_ENRICHED_LESSON_MUTATION);

  usePlayerKeyboardShortcuts({
    play: player.play,
    pause: player.pause,
    seekTo: player.seekTo,
    currentTime: player.currentTime,
    isPlaying: player.isPlaying,
  });

  const handleIngest = useCallback(
    async (url: string) => {
      await ingest({ input: { lessonId, youtubeUrl: url } });
      refetch();
    },
    [ingest, lessonId, refetch]
  );

  const handleTimestampSave = useCallback(
    async (blockId: string, startTime: number, endTime: number | null) => {
      await setTimestamp({ input: { blockId, startTime, endTime } });
      refetch();
    },
    [setTimestamp, refetch]
  );

  const handlePublish = useCallback(async () => {
    await publish({ lessonId });
    refetch();
  }, [publish, lessonId, refetch]);

  const title = data?.lesson?.title ?? 'Lesson Enrichment Editor';
  const videoId = data?.youtubeVideoId;

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        <div className="flex-shrink-0 px-4 pt-2 flex items-center gap-3">
          <PageHeader
            title={title}
            breadcrumbs={[
              { label: 'Courses', href: '/courses' },
              { label: title },
              { label: 'Enrich' },
            ]}
            className="mb-0 flex-1"
          />
          {data?.enrichmentStatus &&
            TERMINAL_STATUSES.has(data.enrichmentStatus) && (
              <Badge variant="outline">{data.enrichmentStatus}</Badge>
            )}
          {data?.enrichmentStatus &&
            !TERMINAL_STATUSES.has(data.enrichmentStatus) && (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <span className="h-3.5 w-3.5 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span>
                  {PROCESSING_STATUS_LABELS[data.enrichmentStatus] ??
                    data.enrichmentStatus}
                </span>
              </div>
            )}
          <Button
            onClick={handlePublish}
            disabled={data?.enrichmentStatus !== 'READY'}
            size="sm"
          >
            <Send className="h-4 w-4 me-1" /> Publish
          </Button>
        </div>

        {/* YouTube URL input (shown when no video yet) */}
        {!videoId && !fetching && (
          <div className="px-4 py-6 max-w-xl">
            <YouTubeUrlInput onSubmit={handleIngest} />
          </div>
        )}

        {/* Main editor layout */}
        {videoId && (
          <ResizablePanelGroup
            orientation="horizontal"
            className="flex-1 overflow-hidden"
          >
            {/* LEFT — Player + Transcript */}
            <ResizablePanel defaultSize={50} minSize={30} id="editor-left">
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex-shrink-0">
                  <YouTubeEmbedPlayer
                    ref={player.playerRef}
                    videoId={videoId}
                    onReady={player.handleReady}
                    onTimeUpdate={player.handleTimeUpdate}
                    onStateChange={player.handleStateChange}
                    className="w-full aspect-video"
                  />
                </div>
                <div className="flex-1 overflow-hidden border-t">
                  {/* GAP-5: auto-scroll to active block as video plays */}
                  <SyncTranscriptScroller
                    blocks={data?.blocks ?? []}
                    currentTime={player.currentTime}
                    onSeek={player.seekTo}
                    className="h-full"
                  />
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* RIGHT — Authoring tools */}
            <ResizablePanel defaultSize={50} minSize={25} id="editor-right">
              <Tabs defaultValue="citations" className="h-full flex flex-col">
                <TabsList className="mx-3 mt-2">
                  <TabsTrigger value="citations">Citations</TabsTrigger>
                  <TabsTrigger value="anchors">Anchors</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent
                  value="citations"
                  className="flex-1 overflow-hidden"
                >
                  <CitationReviewPanel
                    citations={data?.citations ?? []}
                    onApprove={approve}
                    onReject={reject}
                    onEdit={setEditCitationId}
                  />
                </TabsContent>
                <TabsContent value="anchors" className="flex-1 overflow-hidden">
                  <TimestampAnchorEditor
                    blocks={data?.blocks ?? []}
                    currentTime={player.currentTime}
                    onSave={handleTimestampSave}
                  />
                </TabsContent>
                <TabsContent value="preview" className="flex-1 overflow-hidden">
                  <EnrichedTranscriptPanel
                    blocks={data?.blocks ?? []}
                    currentTime={player.currentTime}
                    mode="student"
                  />
                </TabsContent>
              </Tabs>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {/* Citation edit modal */}
      <CitationEditModal
        open={editCitationId !== null}
        citation={editCitation}
        onClose={() => setEditCitationId(null)}
        onSaved={refetch}
      />
    </Layout>
  );
}
