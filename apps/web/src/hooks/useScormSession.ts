/**
 * useScormSession — initializes a SCORM session for a given content item.
 *
 * Returns the session ID (used to render ScormPlayer) and loading/error state.
 * Memory-safe: no timers or subscriptions to clean up.
 */
import { useMutation } from 'urql';

const INIT_SCORM_SESSION = `
  mutation InitScormSession($contentItemId: ID!) {
    initScormSession(contentItemId: $contentItemId) {
      id
      lessonStatus
      scoreRaw
      suspendData
    }
  }
`;

export interface ScormSessionResult {
  id: string;
  lessonStatus: string;
  scoreRaw: number | null;
  suspendData: string | null;
}

export function useScormSession() {
  const [result, initSession] = useMutation<
    { initScormSession: ScormSessionResult },
    { contentItemId: string }
  >(INIT_SCORM_SESSION);

  return {
    initSession: (contentItemId: string) => initSession({ contentItemId }),
    session: result.data?.initScormSession ?? null,
    fetching: result.fetching,
    error: result.error?.message ?? null,
  };
}
