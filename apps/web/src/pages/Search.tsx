import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from 'urql';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Search as SearchIcon,
  BookOpen,
  FileText,
  Network,
  MessageSquare,
  Clock,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { SEARCH_SEMANTIC_QUERY } from '@/lib/graphql/knowledge.queries';
import { mockTranscript } from '@/lib/mock-content-data';
import { getThreadedAnnotations } from '@/lib/mock-annotations';
import { mockGraphData } from '@/lib/mock-graph-data';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

// ─── Types ────────────────────────────────────────────────────────────────────
type ResultType = 'transcript' | 'annotation' | 'concept' | 'course';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  snippet: string;
  meta?: string; // e.g. timestamp, course name
  timestamp?: number;
  href?: string;
}

// ─── Mock search ──────────────────────────────────────────────────────────────
const MOCK_COURSES = [
  {
    id: 'course-1',
    title: 'Introduction to Talmud Study',
    description: 'Fundamentals of Talmudic reasoning and argumentation',
  },
  {
    id: 'course-2',
    title: 'Advanced Chavruta Techniques',
    description: 'Collaborative Talmud learning with AI assistance',
  },
  {
    id: 'course-3',
    title: 'Knowledge Graph Navigation',
    description: 'Explore interconnected concepts in Jewish texts',
  },
];

function mockSearch(query: string): SearchResult[] {
  if (!query.trim() || query.length < 2) return [];
  const q = query.toLowerCase();

  const transcriptResults: SearchResult[] = mockTranscript
    .filter((s) => s.text.toLowerCase().includes(q))
    .slice(0, 4)
    .map((s) => ({
      id: `tr-${s.id}`,
      type: 'transcript' as const,
      title: 'Introduction to Talmudic Reasoning',
      snippet: s.text,
      meta: formatTime(s.startTime),
      timestamp: s.startTime,
      href: `/learn/content-1?t=${s.startTime}`,
    }));

  const annotationResults: SearchResult[] = getThreadedAnnotations()
    .filter((a) => a.content.toLowerCase().includes(q))
    .slice(0, 3)
    .map((a) => ({
      id: `ann-${a.id}`,
      type: 'annotation' as const,
      title: a.userName ?? 'Unknown',
      snippet: a.content,
      meta: a.layer,
      timestamp: a.contentTimestamp,
      href: a.contentTimestamp !== undefined
        ? `/learn/content-1?t=${a.contentTimestamp}`
        : '/annotations',
    }));

  const conceptResults: SearchResult[] = mockGraphData.nodes
    .filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        (n.description ?? '').toLowerCase().includes(q)
    )
    .slice(0, 4)
    .map((n) => ({
      id: `concept-${n.id}`,
      type: 'concept' as const,
      title: n.label,
      snippet: n.description ?? `${n.type} in the knowledge graph`,
      meta: n.type,
      href: '/graph',
    }));

  const courseResults: SearchResult[] = MOCK_COURSES.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
  ).map((c) => ({
    id: `course-${c.id}`,
    type: 'course' as const,
    title: c.title,
    snippet: c.description,
    href: '/courses',
  }));

  return [...courseResults, ...transcriptResults, ...annotationResults, ...conceptResults];
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── Result icons ─────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  ResultType,
  { icon: typeof BookOpen; label: string; color: string; bg: string }
> = {
  course: {
    icon: BookOpen,
    label: 'Course',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
  },
  transcript: {
    icon: MessageSquare,
    label: 'Transcript',
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
  },
  annotation: {
    icon: FileText,
    label: 'Annotation',
    color: 'text-violet-700',
    bg: 'bg-violet-50 border-violet-200',
  },
  concept: {
    icon: Network,
    label: 'Concept',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
  },
};

// ─── Highlight helper ─────────────────────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim() || query.length < 2) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  const lower = query.toLowerCase();
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === lower ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SearchPage() {
  const { t } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') ?? '';
  const [inputValue, setInputValue] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // GraphQL semantic search (real mode)
  const [searchResult] = useQuery({
    query: SEARCH_SEMANTIC_QUERY,
    variables: { query, limit: 20 },
    pause: DEV_MODE || query.length < 2,
  });

  // Debounce input
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (inputValue.trim().length >= 2) {
      setIsSearching(true);
      debounceRef.current = setTimeout(() => {
        setQuery(inputValue);
        setSearchParams({ q: inputValue }, { replace: true });
        setIsSearching(false);
      }, 300);
    } else {
      setQuery('');
      setSearchParams({}, { replace: true });
      setIsSearching(false);
    }
    return () => clearTimeout(debounceRef.current);
  }, [inputValue, setSearchParams]);

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Map SemanticResult → SearchResult
  const realResults: SearchResult[] = (
    (searchResult.data?.searchSemantic ?? []) as Array<{
      id: string;
      text: string;
      similarity: number;
      entityType: string;
      entityId: string;
    }>
  ).map((r) => {
    const isConceptType = r.entityType === 'concept';
    const type: ResultType = isConceptType ? 'concept' : 'transcript';
    return {
      id: r.id,
      type,
      title: isConceptType ? r.text.split('\n')[0]?.slice(0, 80) ?? r.entityType : query,
      snippet: r.text,
      meta: `${Math.round(r.similarity * 100)}% match`,
      href: isConceptType ? '/graph' : `/learn/${r.entityId}`,
    };
  });

  // Determine if GraphQL failed and we need to fall back to offline mock search
  const isOfflineFallback = !DEV_MODE && !!searchResult.error && query.length >= 2;

  // Build results: dev mode → mock, real mode with error → offline mock fallback, real mode ok → real
  const results: SearchResult[] = DEV_MODE
    ? mockSearch(query)
    : isOfflineFallback
      ? mockSearch(query)
      : realResults;

  const loading =
    (!DEV_MODE && searchResult.fetching) || isSearching;

  // Group by type
  const grouped = results.reduce<Partial<Record<ResultType, SearchResult[]>>>(
    (acc, r) => {
      (acc[r.type] ??= []).push(r);
      return acc;
    },
    {}
  );

  const typeOrder: ResultType[] = ['course', 'transcript', 'annotation', 'concept'];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Search input */}
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') navigate(-1);
            }}
            placeholder={t('searchFullPlaceholder')}
            className="w-full pl-12 pr-4 py-3 text-lg border-2 border-primary/30 rounded-xl bg-background focus:outline-none focus:border-primary transition-colors shadow-sm"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Offline fallback banner — shown instead of hard error, results still appear below */}
        {isOfflineFallback && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" aria-hidden="true" />
            Offline mode — showing cached results
          </div>
        )}

        {/* Loading skeleton */}
        {loading && query.length >= 2 && (
          <div className="space-y-3" aria-busy="true" aria-label="Loading results">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-xl border bg-muted/30 p-4 animate-pulse">
                <div className="h-4 w-1/3 rounded bg-muted mb-2" />
                <div className="h-3 w-full rounded bg-muted mb-1" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {/* Result count */}
        {query.length >= 2 && !loading && (
          <p className="text-sm text-muted-foreground px-1">
            {results.length === 0
              ? t('noResults')
              : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`}
          </p>
        )}

        {/* Empty state */}
        {query.length < 2 && (
          <div className="text-center py-16 space-y-3">
            <SearchIcon className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">
              {t('searchHint')}
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {['Talmud', 'chavruta', 'kal vachomer', 'Rambam', 'pilpul'].map((s) => (
                <button
                  key={s}
                  onClick={() => setInputValue(s)}
                  className="px-3 py-1.5 rounded-full border text-sm hover:bg-muted/60 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results grouped by type */}
        {!loading && typeOrder.map((type) => {
          const items = grouped[type];
          if (!items || items.length === 0) return null;
          const config = TYPE_CONFIG[type];
          const Icon = config.icon;
          return (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.color}`} />
                <h3 className={`text-sm font-semibold uppercase tracking-wide ${config.color}`}>
                  {config.label}s
                </h3>
                <span className="text-xs text-muted-foreground">({items.length})</span>
              </div>
              <div className="space-y-2">
                {items.map((r) => (
                  <Card
                    key={r.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow border ${config.bg}`}
                    onClick={() => r.href && navigate(r.href)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${config.color} truncate`}>
                            <Highlight text={r.title} query={query} />
                          </p>
                          <p className="text-sm text-foreground/80 mt-0.5 line-clamp-2">
                            <Highlight text={r.snippet} query={query} />
                          </p>
                          {r.meta && (
                            <div className="flex items-center gap-1 mt-1.5">
                              {r.timestamp !== undefined ? (
                                <Clock className="h-3 w-3 text-muted-foreground" />
                              ) : null}
                              <span className="text-xs text-muted-foreground">{r.meta}</span>
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {DEV_MODE && query.length >= 2 && (
          <p className="text-xs text-center text-muted-foreground pb-4">
            Dev Mode — mock search results. Set VITE_DEV_MODE=false for live semantic search.
          </p>
        )}
      </div>
    </Layout>
  );
}
