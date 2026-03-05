/**
 * ContextPanel — HybridRAG context sidebar shown during video playback.
 * Queries searchSemantic with the active transcript segment text and displays
 * related concepts and transcript snippets (G1 — PRD feature).
 */
import { useEffect, useState } from 'react';
import { useQuery } from 'urql';
import { Network, MessageSquare, Loader2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SEARCH_SEMANTIC_QUERY } from '@/lib/graphql/knowledge.queries';
import type { TranscriptSegment } from '@/lib/mock-content-data';

interface SemanticResult {
  id: string;
  text: string;
  similarity: number;
  entityType: string;
  entityId: string;
  startTime: number | null;
}

interface Props {
  /** Transcript segment currently active (highlighted) during playback. */
  activeSegment: TranscriptSegment | null;
  /** Called when user clicks a timestamp link in context results. */
  onSeek?: (t: number) => void;
}

function SimilarityBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <span className="text-[9px] font-medium text-muted-foreground tabular-nums">
      {pct}%
    </span>
  );
}

export function ContextPanel({ activeSegment, onSeek }: Props) {
  // Debounce the query text so rapid playback position changes don't hammer the API.
  const [queryText, setQueryText] = useState('');

  useEffect(() => {
    if (!activeSegment?.text) {
      setQueryText('');
      return;
    }
    const t = setTimeout(() => {
      setQueryText(activeSegment.text.slice(0, 120));
    }, 600);
    return () => clearTimeout(t);
  }, [activeSegment?.text]);

  const [result] = useQuery<{ searchSemantic: SemanticResult[] }>({
    query: SEARCH_SEMANTIC_QUERY,
    variables: { query: queryText, limit: 8 },
    pause: queryText.length < 5,
  });

  const results: SemanticResult[] = result.data?.searchSemantic ?? [];
  const concepts = results.filter((r) => r.entityType === 'concept').slice(0, 4);
  const segments = results.filter((r) => r.entityType !== 'concept').slice(0, 4);

  if (!activeSegment) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center text-muted-foreground">
        <Lightbulb className="h-8 w-8 opacity-20" />
        <p className="text-xs">Play the video — related concepts will appear here automatically</p>
      </div>
    );
  }

  if (result.fetching) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Finding related concepts…</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center text-muted-foreground">
        <Network className="h-8 w-8 opacity-20" />
        <p className="text-xs">No related concepts found for this segment</p>
        <p className="text-[10px] italic truncate max-w-full opacity-60">
          &ldquo;{activeSegment.text.slice(0, 60)}&hellip;&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-3">
      {concepts.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <Network className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Related Concepts
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {concepts.map((r) => (
              <div
                key={r.id}
                className={cn(
                  'rounded-md border p-2 bg-amber-50 border-amber-200'
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="text-[11px] font-medium text-amber-900 leading-snug line-clamp-2">
                    {r.text.split('\n')[0]?.slice(0, 80)}
                  </p>
                  <SimilarityBadge score={r.similarity} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {segments.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare className="h-3.5 w-3.5 text-green-600" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Related Segments
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {segments.map((r) => (
              <div
                key={r.id}
                className={cn(
                  'rounded-md border p-2 bg-green-50 border-green-200'
                )}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <p className="text-[11px] text-green-900 leading-snug line-clamp-3">
                    {r.text.slice(0, 120)}
                  </p>
                  <SimilarityBadge score={r.similarity} />
                </div>
                {r.startTime != null && onSeek && (
                  <button
                    className="text-[10px] text-green-700 hover:underline font-medium"
                    onClick={() => onSeek(r.startTime!)}
                  >
                    Jump to {Math.floor(r.startTime / 60)}:{String(Math.floor(r.startTime % 60)).padStart(2, '0')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
