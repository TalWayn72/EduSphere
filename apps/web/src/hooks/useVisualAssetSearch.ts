import { useState, useCallback, useRef, useEffect } from 'react';
import { useClient } from 'urql';
import { GET_VISUAL_ASSETS } from '@/components/visual-anchoring/visual-anchor.graphql';
import type { VisualAsset } from '@/components/visual-anchoring/visual-anchor.types';

const DEBOUNCE_MS = 300;

/**
 * Debounced visual asset search hook.
 * Filters by filename and alt text (client-side after initial load).
 * Only shows CLEAN assets.
 * Memory-safe: clears debounce timer on unmount.
 */
export function useVisualAssetSearch(courseId: string) {
  const [query, setQuery] = useState('');
  const [allAssets, setAllAssets] = useState<VisualAsset[]>([]);
  const [fetching, setFetching] = useState(false);
  // Capture client in a ref so it never participates in effect deps —
  // urql's Client is stable in production but test mocks may create new
  // objects on each render, which would cause an infinite re-render loop.
  const clientRef = useRef(useClient());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load all course assets once per courseId change
  useEffect(() => {
    setFetching(true);
    void clientRef.current
      .query(GET_VISUAL_ASSETS, { courseId })
      .toPromise()
      .then((result) => {
        const assets =
          (result.data?.getVisualAssets as VisualAsset[] | undefined) ?? [];
        // Only show clean assets
        setAllAssets(assets.filter((a) => a.scanStatus === 'CLEAN'));
      })
      .finally(() => setFetching(false));
  }, [courseId]);

  const handleSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => setQuery(value.trim().toLowerCase()),
      DEBOUNCE_MS
    );
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const results = query
    ? allAssets.filter(
        (a) =>
          a.filename.toLowerCase().includes(query) ||
          (a.metadata.altText ?? '').toLowerCase().includes(query)
      )
    : allAssets;

  return { results, fetching, query, handleSearch };
}
