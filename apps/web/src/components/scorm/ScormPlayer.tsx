/**
 * ScormPlayer — renders a SCORM content item inside an iframe.
 *
 * The iframe src points to the backend /scorm/launch/:sessionId endpoint
 * which injects the SCORM 1.2 API shim into the HTML before serving it.
 *
 * postMessage events from the iframe are forwarded to GraphQL mutations
 * for session persistence.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useMutation } from 'urql';

const UPDATE_SCORM_SESSION = `
  mutation UpdateScormSession($sessionId: ID!, $data: String!) {
    updateScormSession(sessionId: $sessionId, data: $data)
  }
`;

const FINISH_SCORM_SESSION = `
  mutation FinishScormSession($sessionId: ID!, $data: String!) {
    finishScormSession(sessionId: $sessionId, data: $data)
  }
`;

interface ScormPlayerProps {
  sessionId: string;
  contentItemId: string;
  className?: string;
}

interface ScormMessage {
  type: 'SCORM_SET' | 'SCORM_COMMIT' | 'SCORM_FINISH';
  sessionId: string;
  data?: Record<string, string>;
  element?: string;
  value?: string;
}

const SUBGRAPH_CONTENT_URL =
  import.meta.env.VITE_CONTENT_SERVICE_URL ?? 'http://localhost:4002';

export function ScormPlayer({
  sessionId,
  contentItemId: _contentItemId,
  className,
}: ScormPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [, updateSession] = useMutation(UPDATE_SCORM_SESSION);
  const [, finishSession] = useMutation(FINISH_SCORM_SESSION);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Only handle messages from our iframe origin
      if (
        event.origin !== SUBGRAPH_CONTENT_URL &&
        event.origin !== window.location.origin
      ) {
        return;
      }

      const msg = event.data as ScormMessage | undefined;
      if (!msg?.type || msg.sessionId !== sessionId) return;

      if (msg.type === 'SCORM_COMMIT' && msg.data) {
        void updateSession({
          sessionId,
          data: JSON.stringify(msg.data),
        });
      } else if (msg.type === 'SCORM_FINISH' && msg.data) {
        void finishSession({
          sessionId,
          data: JSON.stringify(msg.data),
        });
      }
    },
    [sessionId, updateSession, finishSession]
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const launchUrl = `${SUBGRAPH_CONTENT_URL}/scorm/launch/${sessionId}`;

  return (
    <iframe
      ref={iframeRef}
      src={launchUrl}
      title="SCORM Content"
      className={className ?? 'w-full h-full border-0'}
      allow="fullscreen"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      data-testid="scorm-player"
    />
  );
}
