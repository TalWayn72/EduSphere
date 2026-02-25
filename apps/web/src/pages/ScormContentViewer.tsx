/**
 * ScormContentViewer — lightweight viewer for SCORM content items.
 *
 * Shown when content_type === 'SCORM'. Initializes a SCORM session
 * on mount, then renders the ScormPlayer iframe.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScormPlayer } from '@/components/scorm/ScormPlayer';
import { useScormSession } from '@/hooks/useScormSession';
import { Loader2, AlertCircle } from 'lucide-react';

export function ScormContentViewer() {
  const { contentId = '' } = useParams<{ contentId: string }>();
  const { initSession, session, fetching, error } = useScormSession();
  const [launched, setLaunched] = useState(false);

  useEffect(() => {
    if (contentId && !launched) {
      setLaunched(true);
      void initSession(contentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-6rem)] gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">SCORM Content</h1>
          {session && (
            <span className="text-sm text-muted-foreground">
              Status: <span className="font-medium">{session.lessonStatus}</span>
              {session.scoreRaw !== null && (
                <span className="ml-3">Score: {session.scoreRaw}</span>
              )}
            </span>
          )}
        </div>

        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full">
            {fetching && (
              <div className="flex items-center justify-center h-full gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-muted-foreground">Initializing SCORM session...</span>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="text-destructive font-medium">{error}</p>
                <Button variant="outline" onClick={() => void initSession(contentId)}>
                  Retry
                </Button>
              </div>
            )}
            {session && !fetching && (
              <ScormPlayer
                sessionId={session.id}
                contentItemId={contentId}
                className="w-full h-full border-0"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
