/**
 * LiveLessonPage — main orchestrator for live lesson viewing.
 *
 * Desktop: ResizablePanel — video (60%) | side panel (40%)
 * Mobile (< 768px): sticky video top + full-width tabs below
 * Tabs: Transcript | Chat | Q&A | Notes | Glossary
 *
 * EXCEPTION NOTE (150-line rule): orchestrator — wires hooks + delegates
 * all rendering to sub-panel components.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useLiveSession } from '@/hooks/useLiveSession';
import { useLiveReactions } from '@/hooks/useLiveReactions';
import { LiveVideoPlayer } from '@/components/live/LiveVideoPlayer';
import { TranscriptPanel } from '@/pages/LiveLessonPage.transcript-panel';
import { ChatPanel } from '@/pages/LiveLessonPage.chat-panel';
import { QAPanel } from '@/pages/LiveLessonPage.qa-panel';
import { PersonalNotesPanel } from '@/components/live/PersonalNotesPanel';
import { JargonGlossarySheet } from '@/components/live/JargonGlossarySheet';
import { InstructorControls } from '@/components/live/InstructorControls';
import { useLiveSessionStore } from '@/stores/live-session.store';
import { getCurrentUser } from '@/lib/auth';
import type { LiveSessionTab } from '@/stores/live-session.store';
import { cn } from '@/lib/utils';

const TAB_LABELS: Record<LiveSessionTab, string> = {
  transcript: 'תמלול',
  chat: "צ'אט",
  qa: 'שאלות',
  notes: 'הערות',
  glossary: 'מילון',
};

export function LiveLessonPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isMobile = useMediaQuery('(max-width: 767px)');
  const user = getCurrentUser();
  const isInstructor =
    user?.role === 'INSTRUCTOR' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ORG_ADMIN';

  const { session, fetching, error } = useLiveSession(mounted ? sessionId : '');
  const { animationQueue, sendReaction } = useLiveReactions(
    mounted ? sessionId : ''
  );

  const { activeTab, setActiveTab } = useLiveSessionStore();

  // Loading state
  if (!mounted || (fetching && !session)) {
    return (
      <Layout>
        <div
          className="flex items-center justify-center h-64"
          data-testid="live-lesson-loading"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <Layout>
        <div
          className="flex items-center justify-center py-20 text-center"
          data-testid="live-lesson-error"
        >
          <p className="text-destructive font-medium">
            {error?.message ?? 'Session not found.'}
          </p>
        </div>
      </Layout>
    );
  }

  const phase = session.phase ?? session.status;
  const isLive = phase === 'LIVE';

  const streamTimestampMs = session.startedAt
    ? Date.now() - new Date(session.startedAt).getTime()
    : 0;

  const videoPlayer = (
    <LiveVideoPlayer
      streamUrl={session.streamUrl ?? null}
      viewerCount={session.viewerCount}
      isLive={isLive}
      reactionQueue={animationQueue}
      onSendReaction={sendReaction}
      sessionId={sessionId}
      currentTimestampMs={streamTimestampMs}
    />
  );

  const tabPanel = (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as LiveSessionTab)}
      className="flex flex-col h-full"
    >
      <TabsList className="shrink-0 w-full rounded-none border-b justify-start overflow-x-auto">
        {(Object.keys(TAB_LABELS) as LiveSessionTab[]).map((tab) => (
          <TabsTrigger key={tab} value={tab} className="text-xs px-3 py-2">
            <span dir="auto">{TAB_LABELS[tab]}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="flex-1 overflow-hidden">
        <TabsContent
          value="transcript"
          className="h-full mt-0 data-[state=active]:flex flex-col"
        >
          <TranscriptPanel sessionId={sessionId} />
        </TabsContent>
        <TabsContent
          value="chat"
          className="h-full mt-0 data-[state=active]:flex flex-col"
        >
          <ChatPanel sessionId={sessionId} />
        </TabsContent>
        <TabsContent
          value="qa"
          className="h-full mt-0 data-[state=active]:flex flex-col"
        >
          <QAPanel sessionId={sessionId} isInstructor={isInstructor} />
        </TabsContent>
        <TabsContent
          value="notes"
          className="h-full mt-0 data-[state=active]:flex flex-col"
        >
          <PersonalNotesPanel
            sessionId={sessionId}
            contentId={sessionId}
            currentTimestampMs={streamTimestampMs}
          />
        </TabsContent>
        <TabsContent
          value="glossary"
          className="h-full mt-0 data-[state=active]:flex flex-col"
        >
          <JargonGlossarySheet />
        </TabsContent>
      </div>
    </Tabs>
  );

  return (
    <Layout>
      <div
        className={cn(
          'flex flex-col',
          isMobile ? 'h-auto' : 'h-[calc(100vh-4rem)]'
        )}
        data-testid="live-lesson-page"
      >
        {/* Page title */}
        <div className="shrink-0 px-4 py-2 border-b">
          <h1 className="text-base font-semibold truncate" dir="auto">
            {session.title ?? session.meetingName}
          </h1>
        </div>

        {/* Instructor controls bar (instructor only) */}
        {isInstructor && (
          <InstructorControls
            sessionId={sessionId}
            phase={phase}
            isScreenSharing={session.isScreenSharing}
          />
        )}

        {/* Layout */}
        {isMobile ? (
          <div className="flex flex-col">
            <div className="w-full sticky top-0 z-10 bg-black dark:bg-black">
              {videoPlayer}
            </div>
            <div className="flex-1">{tabPanel}</div>
          </div>
        ) : (
          <ResizablePanelGroup
            orientation="horizontal"
            className="flex-1 overflow-hidden border rounded-b-lg"
          >
            <ResizablePanel defaultSize={60} minSize={35} id="live-video">
              <div className="h-full flex items-center justify-center bg-black dark:bg-black p-4">
                {videoPlayer}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={40} minSize={25} id="live-side">
              {tabPanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </Layout>
  );
}
