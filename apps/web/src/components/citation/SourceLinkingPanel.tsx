/**
 * SourceLinkingPanel — displays detected citations for a lesson and lets
 * instructors link each citation to a knowledge source or upload a new one.
 */
import { useState } from 'react';
import { useQuery } from 'urql';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AddSourceModal } from '@/components/source-manager/AddSourceModal';
import { ENRICHED_LESSON_QUERY } from '@/lib/graphql/enriched-lesson.queries';
import { COURSE_KNOWLEDGE_SOURCES } from '@/lib/graphql/sources.queries';
import type { LessonCitation } from '@/components/enriched-transcript/enriched-transcript.types';
import { CitationRow, type KnowledgeSource } from './CitationRow';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SourceLinkingPanelProps {
  lessonId: string;
  courseId: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SourceLinkingPanel({
  lessonId,
  courseId,
}: SourceLinkingPanelProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [lessonResult] = useQuery({
    query: ENRICHED_LESSON_QUERY,
    variables: { lessonId },
  });

  const [sourcesResult, refetchSources] = useQuery({
    query: COURSE_KNOWLEDGE_SOURCES,
    variables: { courseId },
  });

  const citations: LessonCitation[] =
    lessonResult.data?.enrichedLesson?.citations ?? [];
  const sources: KnowledgeSource[] =
    sourcesResult.data?.courseKnowledgeSources ?? [];

  const isLoading = lessonResult.fetching || sourcesResult.fetching;

  return (
    <div dir="auto" data-testid="source-linking-panel">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Detected Citations ({citations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && (
            <>
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </>
          )}

          {!isLoading && citations.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No citations detected for this lesson yet.
            </p>
          )}

          {!isLoading &&
            citations.map((citation) => (
              <CitationRow
                key={citation.id}
                citation={citation}
                sources={sources}
                onUploadRequest={() => setShowUploadModal(true)}
              />
            ))}
        </CardContent>
      </Card>

      {showUploadModal && (
        <AddSourceModal
          courseId={courseId}
          onClose={() => setShowUploadModal(false)}
          onAdded={() => {
            setShowUploadModal(false);
            refetchSources({ requestPolicy: 'network-only' });
          }}
        />
      )}
    </div>
  );
}
