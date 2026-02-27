/**
 * ToolsPanel — right panel of UnifiedLearningPage.
 * Vertical ResizableGroup: top = Video + Transcript, bottom = Tabs (Annotations | AI | Collab).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, FileText, Bot, Users } from 'lucide-react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { VideoPlayerCore } from '@/components/VideoPlayerCore';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { VideoProgressMarkers } from '@/components/VideoProgressMarkers';
import { AddAnnotationOverlay } from '@/components/AddAnnotationOverlay';
import type { TranscriptSegment } from '@/lib/mock-content-data';
import type { Annotation, AnnotationLayer } from '@/types/annotations';
import type { UseAgentChatReturn } from '@/hooks/useAgentChat';
import { AnnotationsTab } from '@/pages/UnifiedLearningPage.annotations-tab';
import { AiTab } from '@/pages/UnifiedLearningPage.ai-tab';

type Tab = 'annotations' | 'ai' | 'collab';

interface Props {
  videoUrl: string;
  hlsManifestUrl: string | null;
  transcript: TranscriptSegment[];
  annotations: Annotation[];
  annotationsFetching: boolean;
  currentTime: number;
  duration: number;
  seekTarget: number | undefined;
  onTimeUpdate: (t: number) => void;
  onDurationChange: (d: number) => void;
  onSeek: (t: number) => void;
  onAddAnnotation: (text: string, layer: AnnotationLayer, time: number) => void;
  onReply: (parentId: string, content: string, layer: AnnotationLayer) => void;
  onOverlayAnnotation: (content: string, layer: AnnotationLayer, ts: number) => void;
  bookmarks: { id: string; timestamp: number; label: string; color: string }[];
  chat: UseAgentChatReturn;
}

export function ToolsPanel({
  videoUrl,
  hlsManifestUrl,
  transcript,
  annotations,
  annotationsFetching,
  currentTime,
  duration,
  seekTarget,
  onTimeUpdate,
  onDurationChange,
  onSeek,
  onAddAnnotation,
  onReply,
  onOverlayAnnotation,
  bookmarks,
  chat,
}: Props) {
  const { t } = useTranslation('content');
  const [activeTab, setActiveTab] = useState<Tab>('annotations');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'annotations', label: t('common:annotations', 'הערות'), icon: <FileText className="h-3 w-3" /> },
    { id: 'ai', label: t('chavrutaAi', 'חברותא AI'), icon: <Bot className="h-3 w-3" /> },
    { id: 'collab', label: t('collaboration', 'שיתוף'), icon: <Users className="h-3 w-3" /> },
  ];

  return (
    <ResizablePanelGroup orientation="vertical" className="h-full">
      {/* TOP — Video player + Transcript */}
      <ResizablePanel defaultSize={45} minSize={20} id="video">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Video */}
          <div className="flex-shrink-0 relative">
            <VideoPlayerCore
              src={videoUrl}
              hlsSrc={hlsManifestUrl}
              bookmarks={bookmarks}
              seekTo={seekTarget}
              onTimeUpdate={onTimeUpdate}
              onDurationChange={onDurationChange}
            />
            <div className="absolute bottom-10 left-0 right-0 pointer-events-none">
              <VideoProgressMarkers annotations={annotations} duration={duration} onSeek={onSeek} />
            </div>
            <AddAnnotationOverlay currentTime={currentTime} onSave={onOverlayAnnotation} />
          </div>

          {/* Transcript */}
          <div className="flex-1 overflow-hidden flex flex-col border-t">
            <div className="px-3 py-1.5 border-b flex items-center gap-1.5 text-xs font-semibold flex-shrink-0">
              <BookOpen className="h-3.5 w-3.5" />
              {t('transcript', 'תמלול')}
            </div>
            <div className="flex-1 overflow-hidden">
              <TranscriptPanel segments={transcript} currentTime={currentTime} onSeek={onSeek} />
            </div>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* BOTTOM — Tabs */}
      <ResizablePanel defaultSize={55} minSize={25} id="panels">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b flex-shrink-0" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors flex-1 justify-center
                  ${activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'annotations' && (
              <AnnotationsTab
                annotations={annotations}
                fetching={annotationsFetching}
                currentTime={currentTime}
                onSeek={onSeek}
                onAddAnnotation={onAddAnnotation}
                onReply={onReply}
              />
            )}
            {activeTab === 'ai' && <AiTab chat={chat} />}
            {activeTab === 'collab' && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-4">
                <Users className="h-8 w-8 opacity-20" />
                <p className="text-xs text-center">
                  {t('collaborationComingSoon', 'לימוד משותף — בקרוב')}
                </p>
              </div>
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
