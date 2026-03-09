/**
 * Scorm2004Player — SCORM 2004 (4th Edition) iframe content player.
 *
 * Exposes a postMessage-based SCORM 2004 API to the iframe.
 * The iframe SCORM content sends SetValue/GetValue/Commit/Terminate
 * messages; this component responds and persists state via callbacks.
 *
 * Memory safety: addEventListener is cleaned up on unmount.
 */
import { useRef, useEffect, useCallback } from 'react';
import type { ScormCmiModel } from '@/lib/scorm/scorm2004-data-model';
import {
  createDefaultCmiModel,
  SCORM2004_ERROR_CODES,
} from '@/lib/scorm/scorm2004-data-model';

interface Scorm2004PlayerProps {
  packageUrl: string;       // URL to the SCORM 2004 entry point HTML
  learnerId: string;
  learnerName: string;
  onProgress?: (cmi: Partial<ScormCmiModel>) => void;
  onComplete?: (status: 'passed' | 'failed' | 'completed') => void;
  className?: string;
}

interface ScormApiMessage {
  action: 'SetValue' | 'GetValue' | 'Commit' | 'Terminate' | 'Initialize';
  element?: string;
  value?: string;
}

function resolveCompletionStatus(cmi: ScormCmiModel): 'passed' | 'failed' | 'completed' {
  if (cmi['cmi.success_status'] === 'passed') return 'passed';
  if (cmi['cmi.success_status'] === 'failed') return 'failed';
  return 'completed';
}

export function Scorm2004Player({
  packageUrl,
  learnerId,
  learnerName,
  onProgress,
  onComplete,
  className,
}: Scorm2004PlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cmiRef = useRef<ScormCmiModel>(createDefaultCmiModel(learnerId, learnerName));
  const lastErrorRef = useRef<string>(SCORM2004_ERROR_CODES.NO_ERROR);
  const initializedRef = useRef(false);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      const msg = event.data as ScormApiMessage;
      if (!msg.action) return;

      const reply = (result: string): void => {
        event.source?.postMessage(
          { action: `${msg.action}Result`, result },
          { targetOrigin: '*' },
        );
      };

      switch (msg.action) {
        case 'Initialize': {
          initializedRef.current = true;
          lastErrorRef.current = SCORM2004_ERROR_CODES.NO_ERROR;
          reply('true');
          break;
        }
        case 'SetValue': {
          if (!initializedRef.current || !msg.element) {
            reply('false');
            break;
          }
          if (msg.element in cmiRef.current) {
            (cmiRef.current as unknown as Record<string, unknown>)[msg.element] = msg.value ?? '';
            lastErrorRef.current = SCORM2004_ERROR_CODES.NO_ERROR;
            onProgress?.({ [msg.element]: msg.value } as Partial<ScormCmiModel>);
            if (msg.element === 'cmi.completion_status' && msg.value === 'completed') {
              onComplete?.(resolveCompletionStatus(cmiRef.current));
            }
            reply('true');
          } else {
            lastErrorRef.current = SCORM2004_ERROR_CODES.DATA_MODEL_ELEMENT_NOT_IMPLEMENTED;
            reply('false');
          }
          break;
        }
        case 'GetValue': {
          if (!msg.element || !(msg.element in cmiRef.current)) {
            reply('');
            break;
          }
          const val = (cmiRef.current as unknown as Record<string, unknown>)[msg.element];
          reply(val == null ? '' : String(val));
          break;
        }
        case 'Commit': {
          reply('true');
          break;
        }
        case 'Terminate': {
          initializedRef.current = false;
          reply('true');
          break;
        }
      }
    },
    [onProgress, onComplete],
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  return (
    <iframe
      ref={iframeRef}
      src={packageUrl}
      title="SCORM 2004 Content"
      className={className ?? 'w-full h-full min-h-[600px] border-0'}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      data-testid="scorm2004-player"
    />
  );
}
