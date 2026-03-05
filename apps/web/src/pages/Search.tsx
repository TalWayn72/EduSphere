import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
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
  Bookmark,
  BookmarkCheck,
  Trash2,
  X,
} from 'lucide-react';
import { SEARCH_SEMANTIC_QUERY } from '@/lib/graphql/knowledge.queries';
import {
  SAVED_SEARCHES_QUERY,
  CREATE_SAVED_SEARCH_MUTATION,
  DELETE_SAVED_SEARCH_MUTATION,
} from '@/lib/graphql/search.queries';
import { SEARCH_COURSES_QUERY } from '@/lib/graphql/content.queries';
import { mockTranscript } from '@/lib/mock-content-data';
import { getThreadedAnnotations } from '@/lib/mock-annotations';
import { mockGraphData } from '@/lib/mock-graph-data';
import { DEV_MODE } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────
type ResultType = 'transcript' | 'annotation' | 'concept' | 'course';

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: string | null;
  createdAt: string;
}

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
      href:
        a.contentTimestamp !== undefined
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

  return [
    ...courseResults,
    ...transcriptResults,
    ...annotationResults,
    ...conceptResults,
  ];
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
          <mark
            key={i}
            className="bg-yellow-200 text-yellow-900 rounded px-0.5"
          >
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Saved searches state
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [{ data: savedSearchesData }, refetchSavedSearches] = useQuery({
    query: SAVED_SEARCHES_QUERY,
    pause: !mounted,
    requestPolicy: 'network-only',
  });

  const [, createSavedSearchMutation] = useMutation(CREATE_SAVED_SEARCH_MUTATION);
  const [, deleteSavedSearchMutation] = useMutation(DELETE_SAVED_SEARCH_MUTATION);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState('');
  const [savingSearch, setSavingSearch] = useState(false);
  const [showSavedPanel, setShowSavedPanel] = useState(false);

  // GraphQL semantic search (real mode)
  const [searchResult] = useQuery({
    query: SEARCH_SEMANTIC_QUERY,
    variables: { query, limit: 20 },
    pause: DEV_MODE || query.length < 2,
  });

  // Real course search — always active (not gated by DEV_MODE)
  const [courseSearchResult] = useQuery({
    query: SEARCH_COURSES_QUERY,
    variables: { query, limit: 20 },
    pause: query.length < 2,
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

  // Log course search errors
  useEffect(() => {
    if (courseSearchResult.error) {
      console.error('[Search] Course search failed:', courseSearchResult.error.message);
    }
  }, [courseSearchResult.error]);

  // Map SemanticResult → SearchResult
  const realResults: SearchResult[] = (
    (searchResult.data?.searchSemantic ?? []) as Array<{
      id: string;
      text: string;
      similarity: number;
      entityType: string;
      entityId: string;
      startTime: number | null;
    }>
  ).map((r) => {
    const isConceptType = r.entityType === 'concept';
    const type: ResultType = isConceptType ? 'concept' : 'transcript';
    const timestampParam =
      !isConceptType && r.startTime != null ? `?t=${Math.floor(r.startTime)}` : '';
    return {
      id: r.id,
      type,
      title: isConceptType
        ? (r.text.split('\n')[0]?.slice(0, 80) ?? r.entityType)
        : query,
      snippet: r.text,
      meta: !isConceptType && r.startTime != null
        ? formatTime(r.startTime)
        : `${Math.round(r.similarity * 100)}% match`,
      timestamp: r.startTime ?? undefined,
      href: isConceptType ? '/graph' : `/learn/${r.entityId}${timestampParam}`,
    };
  });

  // Determine if GraphQL failed and we need to fall back to offline mock search
  const isOfflineFallback =
    !DEV_MODE && !!searchResult.error && query.length >= 2;

  // Real course results (from DB) — always shown, never mocked
  const courseResults: SearchResult[] = (
    (courseSearchResult.data?.searchCourses ?? []) as Array<{
      id: string;
      title: string;
      description: string | null;
      slug: string;
      isPublished: boolean;
      estimatedHours: number | null;
      thumbnailUrl: string | null;
    }>
  ).map((c) => ({
    id: `course-${c.id}`,
    type: 'course' as const,
    title: c.title,
    snippet: c.description ?? `Course: ${c.title}`,
    meta: c.estimatedHours ? `${c.estimatedHours}h` : undefined,
    href: `/courses/${c.id}`,
  }));

  // Non-course results: semantic (real) or mock (fallback/dev)
  const nonCourseResults: SearchResult[] = DEV_MODE
    ? mockSearch(query).filter((r) => r.type !== 'course')
    : isOfflineFallback
      ? mockSearch(query).filter((r) => r.type !== 'course')
      : realResults;

  const results: SearchResult[] = [...courseResults, ...nonCourseResults];

  const loading = (!DEV_MODE && searchResult.fetching) || courseSearchResult.fetching || isSearching;

  // Group by type
  const grouped = results.reduce<Partial<Record<ResultType, SearchResult[]>>>(
    (acc, r) => {
      (acc[r.type] ??= []).push(r);
      return acc;
    },
    {}
  );

  const typeOrder: ResultType[] = [
    'course',
    'transcript',
    'annotation',
    'concept',
  ];

  // Saved search handlers
  const handleSaveSearch = async () => {
    if (!savedSearchName.trim() || !query.trim()) return;
    setSavingSearch(true);
    try {
      await createSavedSearchMutation({
        input: { name: savedSearchName.trim(), query },
      });
      setSavedSearchName('');
      setShowSaveModal(false);
      refetchSavedSearches({ requestPolicy: 'network-only' });
    } catch (err) {
      console.error('[Search] Failed to save search:', err);
    } finally {
      setSavingSearch(false);
    }
  };

  const handleDeleteSavedSearch = async (id: string) => {
    await deleteSavedSearchMutation({ id });
    refetchSavedSearches({ requestPolicy: 'network-only' });
  };

  const handleLoadSavedSearch = (saved: SavedSearch) => {
    setSearchParams({ q: saved.query });
    setShowSavedPanel(false);
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Search input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
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
          {/* Saved search buttons */}
          {query.length >= 2 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              title={t('saveSearch', 'Save Search')}
              data-testid="save-search-btn"
              onClick={() => { setSavedSearchName(query); setShowSaveModal(true); }}
            >
              <Bookmark className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            title={t('savedSearches', 'Saved Searches')}
            data-testid="saved-searches-toggle"
            onClick={() => setShowSavedPanel((prev) => !prev)}
          >
            <BookmarkCheck className="h-4 w-4" />
          </Button>
        </div>

        {/* Offline fallback banner — shown instead of hard error, results still appear below */}
        {isOfflineFallback && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800"
          >
            <span
              className="inline-block h-2 w-2 rounded-full bg-amber-400 flex-shrink-0"
              aria-hidden="true"
            />
            Offline mode — showing cached results
          </div>
        )}

        {/* Loading skeleton */}
        {loading && query.length >= 2 && (
          <div
            className="space-y-3"
            aria-busy="true"
            aria-label="Loading results"
          >
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-xl border bg-muted/30 p-4 animate-pulse"
              >
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
            <p className="text-muted-foreground">{t('searchHint')}</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {['Talmud', 'chavruta', 'kal vachomer', 'Rambam', 'pilpul'].map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setInputValue(s)}
                    className="px-3 py-1.5 rounded-full border text-sm hover:bg-muted/60 transition-colors"
                  >
                    {s}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Results grouped by type */}
        {!loading &&
          typeOrder.map((type) => {
            const items = grouped[type];
            if (!items || items.length === 0) return null;
            const config = TYPE_CONFIG[type];
            const Icon = config.icon;
            return (
              <div key={type} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <h3
                    className={`text-sm font-semibold uppercase tracking-wide ${config.color}`}
                  >
                    {config.label}s
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ({items.length})
                  </span>
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
                            <p
                              className={`text-sm font-semibold ${config.color} truncate`}
                            >
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
                                <span className="text-xs text-muted-foreground">
                                  {r.meta}
                                </span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                          >
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
            Dev Mode — mock search results. Set VITE_DEV_MODE=false for live
            semantic search.
          </p>
        )}
      </div>

      {/* Save Search Modal */}
      {showSaveModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
          data-testid="save-search-modal"
          onClick={(e) => e.target === e.currentTarget && setShowSaveModal(false)}
        >
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t('saveSearch', 'Save Search')}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowSaveModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder={t('savedSearchNamePlaceholder', 'Name this search...')}
              value={savedSearchName}
              onChange={(e) => setSavedSearchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSaveSearch()}
              data-testid="save-search-name-input"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSaveModal(false)}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSaveSearch()}
                disabled={savingSearch || !savedSearchName.trim()}
                data-testid="save-search-confirm-btn"
              >
                {savingSearch ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {t('save', 'Save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Searches Sidebar Panel */}
      {showSavedPanel && (
        <div
          className="fixed right-0 top-0 h-full w-72 bg-background border-l shadow-xl z-40 flex flex-col"
          data-testid="saved-searches-panel"
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-sm">{t('savedSearches', 'Saved Searches')}</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowSavedPanel(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {((savedSearchesData as { savedSearches?: SavedSearch[] })?.savedSearches ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('noSavedSearches', 'No saved searches yet')}
              </p>
            ) : (
              ((savedSearchesData as { savedSearches?: SavedSearch[] })?.savedSearches ?? []).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                  data-testid="saved-search-item"
                >
                  <button
                    className="flex-1 text-left text-sm truncate"
                    onClick={() => handleLoadSavedSearch(s)}
                  >
                    {s.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => void handleDeleteSavedSearch(s.id)}
                    data-testid="delete-saved-search-btn"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
