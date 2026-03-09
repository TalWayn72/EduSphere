/**
 * Cmi5Player — cmi5 Assignable Unit (AU) iframe launcher.
 *
 * Renders the AU in an iframe and listens for the cmi5 termination
 * signal via postMessage. The parent is responsible for constructing
 * the full launch URL (including LRS endpoint, registration, actor).
 *
 * Memory safety: addEventListener is cleaned up on unmount.
 */
import { useRef, useEffect } from 'react';

interface Cmi5PlayerProps {
  auUrl: string;          // Full AU launch URL (including cmi5 query params)
  sessionId: string;
  onLaunched?: () => void;
  onTerminated?: () => void;
  className?: string;
}

interface Cmi5PostMessage {
  type: string;
  sessionId?: string;
}

export function Cmi5Player({
  auUrl,
  sessionId,
  onLaunched,
  onTerminated,
  className,
}: Cmi5PlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    onLaunched?.();

    const handleMessage = (event: MessageEvent): void => {
      if (!event.data || typeof event.data !== 'object') return;
      const msg = event.data as Cmi5PostMessage;
      if (msg.type === 'cmi5:terminated' && msg.sessionId === sessionId) {
        onTerminated?.();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sessionId, onLaunched, onTerminated]);

  return (
    <iframe
      ref={iframeRef}
      src={auUrl}
      title="cmi5 Assignable Unit"
      className={className ?? 'w-full h-full min-h-[600px] border-0'}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      data-testid="cmi5-player"
    />
  );
}
