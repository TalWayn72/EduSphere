/** Left column: video player + transcript panel. */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { VideoPlayerCore } from '@/components/VideoPlayerCore';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { VideoProgressMarkers } from '@/components/VideoProgressMarkers';
import { AddAnnotationOverlay } from '@/components/AddAnnotationOverlay';
import { SkeletonLine } from './ContentViewerHelpers';
import { Annotation, AnnotationLayer } from '@/types/annotations';

const ASPECT_RATIO_STYLE: React.CSSProperties = { aspectRatio: '16/9' };

export interface VideoSectionProps {
  videoUrl: string;
  hlsManifestUrl?: string | null;
  videoTitle: string | null;
  contentFetching: boolean;
  transcript: Array<{
    id: string;
    startTime: number;
    endTime: number;
    text: string;
  }>;
  currentTime: number;
  duration: number;
  seekTarget: number | undefined;
  bookmarks: Array<{
    id: string;
    timestamp: number;
    label: string;
    color: string;
  }>;
  annotations: Annotation[];
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onSeek: (time: number) => void;
  onOverlayAnnotation: (
    content: string,
    layer: AnnotationLayer,
    timestamp: number
  ) => void;
}

export const VideoSection = React.memo(function VideoSection({
  videoUrl,
  hlsManifestUrl,
  videoTitle,
  contentFetching,
  transcript,
  currentTime,
  seekTarget,
  bookmarks,
  annotations,
  duration,
  onTimeUpdate,
  onDurationChange,
  onSeek,
  onOverlayAnnotation,
}: VideoSectionProps) {
  const { t } = useTranslation(['content']);

  return (
    <div className="col-span-12 lg:col-span-6 flex flex-col gap-3 overflow-hidden">
      {/* Video player */}
      <Card className="flex-shrink-0">
        <CardContent className="p-0">
          {contentFetching ? (
            <div
              className="w-full bg-muted animate-pulse rounded-lg"
              style={ASPECT_RATIO_STYLE}
              aria-hidden="true"
            />
          ) : (
            <div className="relative">
              <VideoPlayerCore
                src={videoUrl}
                hlsSrc={hlsManifestUrl}
                bookmarks={bookmarks}
                seekTo={seekTarget}
                onTimeUpdate={onTimeUpdate}
                onDurationChange={onDurationChange}
              />
              <div className="absolute bottom-12 left-0 right-0 pointer-events-none">
                <VideoProgressMarkers
                  annotations={annotations}
                  duration={duration}
                  onSeek={onSeek}
                />
              </div>
              <AddAnnotationOverlay
                currentTime={currentTime}
                onSave={onOverlayAnnotation}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-2 border-b flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> {t('content:transcript')}
          </span>
          {contentFetching ? (
            <SkeletonLine className="h-3 w-32" />
          ) : (
            <span className="text-xs text-muted-foreground">{videoTitle}</span>
          )}
        </div>
        {contentFetching ? (
          <div className="flex-1 overflow-hidden px-4 py-2 space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-2">
                <SkeletonLine className="h-3 w-10 flex-shrink-0" />
                <SkeletonLine className="h-3 flex-1" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <TranscriptPanel
              segments={transcript}
              currentTime={currentTime}
              onSeek={onSeek}
            />
          </div>
        )}
      </Card>
    </div>
  );
});
