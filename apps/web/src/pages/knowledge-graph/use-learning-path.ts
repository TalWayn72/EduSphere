import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useQuery } from 'urql';
import { LEARNING_PATH_QUERY } from '@/lib/graphql/knowledge.queries';
import { DEV_MODE } from '@/lib/auth';
import type { ApiLearningPath } from './types';
import { MOCK_LEARNING_PATH } from './constants';

export function useLearningPath() {
  const [pathFrom, setPathFrom] = useState('');
  const [pathTo, setPathTo] = useState('');
  const [pathSearchTrigger, setPathSearchTrigger] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);

  // DEV_MODE mock path state
  const [mockPathResult, setMockPathResult] = useState<ApiLearningPath | null>(
    null
  );
  const [mockPathLoading, setMockPathLoading] = useState(false);
  const mockPathTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Cleanup mock path timer on unmount
  useEffect(() => {
    return () => {
      if (mockPathTimerRef.current) clearTimeout(mockPathTimerRef.current);
    };
  }, []);

  // ── Learning Path query — fires only when user clicks "Find Path" (prod) ──
  const [learningPathResult] = useQuery({
    query: LEARNING_PATH_QUERY,
    variables: {
      from: pathSearchTrigger?.from ?? '',
      to: pathSearchTrigger?.to ?? '',
    },
    pause: DEV_MODE || !pathSearchTrigger,
    requestPolicy: 'network-only',
  } as Parameters<typeof useQuery>[0]);

  // Log GraphQL errors
  useEffect(() => {
    if (learningPathResult.error) {
      console.error(
        '[KnowledgeGraph] Learning path query error:',
        learningPathResult.error.message
      );
    }
  }, [learningPathResult.error]);

  const handleFindPath = useCallback(() => {
    const from = pathFrom.trim();
    const to = pathTo.trim();
    if (!from || !to) {
      setPathError('Both "From" and "To" concept names are required.');
      return;
    }
    if (from.toLowerCase() === to.toLowerCase()) {
      setPathError('"From" and "To" must be different concepts.');
      return;
    }
    setPathError(null);
    setPathSearchTrigger({ from, to });

    if (DEV_MODE) {
      setMockPathResult(null);
      setMockPathLoading(true);
      if (mockPathTimerRef.current) clearTimeout(mockPathTimerRef.current);
      mockPathTimerRef.current = setTimeout(() => {
        setMockPathLoading(false);
        setMockPathResult(MOCK_LEARNING_PATH);
      }, 600);
      return;
    }
  }, [pathFrom, pathTo]);

  // In DEV_MODE use mock result; in production use real query response.
  const learningPath: ApiLearningPath | null = DEV_MODE
    ? mockPathResult
    : ((
        learningPathResult.data as
          | { learningPath?: ApiLearningPath }
          | undefined
      )?.learningPath ?? null);

  // IDs that are on the active learning path — used to highlight nodes
  const pathNodeIds = useMemo(
    () => new Set((learningPath?.concepts ?? []).map((c) => c.id)),
    [learningPath]
  );

  const isPathLoading = DEV_MODE
    ? mockPathLoading
    : learningPathResult.fetching;

  return {
    pathFrom,
    setPathFrom,
    pathTo,
    setPathTo,
    pathSearchTrigger,
    pathError,
    learningPath,
    learningPathResult,
    mockPathLoading,
    pathNodeIds,
    isPathLoading,
    handleFindPath,
  };
}
