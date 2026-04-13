/**
 * JargonGlossarySheet — Glossary tab panel for LiveLessonPage.
 *
 * - Fetches jargon domains for the lesson via DETECT_LESSON_DOMAINS_QUERY (when lessonId provided)
 *   OR falls back to JARGON_DOMAINS_QUERY for all tenant domains.
 * - Search/filter input filters by canonicalForm or definitionShort
 * - List of terms: canonical form + short definition
 * - Click term → expandable full definition section
 * - dir="auto" for Hebrew term support
 */
import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from 'urql';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  JARGON_DOMAINS_QUERY,
  JARGON_TERMS_QUERY,
  DETECT_LESSON_DOMAINS_QUERY,
} from '@/lib/graphql/jargon.queries';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface JargonGlossarySheetProps {
  /** Optional lessonId — used to detect relevant domains via DETECT_LESSON_DOMAINS */
  lessonId?: string;
  className?: string;
}

interface JargonTerm {
  id: string;
  canonicalForm: string;
  definitionShort: string;
  altForms: string[] | null;
  language: string | null;
}

// ── Sub-component: TermRow ────────────────────────────────────────────────────

interface TermRowProps {
  term: JargonTerm;
}

function TermRow({ term }: TermRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="border-b last:border-b-0 py-2.5 px-1"
      data-testid="glossary-term-row"
    >
      <button
        type="button"
        className="w-full flex items-start justify-between gap-2 text-left group"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <p
            className="font-medium text-sm leading-snug"
            dir="auto"
            data-testid="glossary-canonical"
          >
            {term.canonicalForm}
          </p>
          {!expanded && (
            <p
              className="text-xs text-muted-foreground mt-0.5 line-clamp-2"
              dir="auto"
            >
              {term.definitionShort}
            </p>
          )}
        </div>
        <span className="shrink-0 mt-0.5 text-muted-foreground group-hover:text-foreground">
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 pl-1" data-testid="glossary-term-expanded">
          <p className="text-sm leading-relaxed" dir="auto">
            {term.definitionShort}
          </p>
          {term.altForms && term.altForms.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {term.altForms.map((alt) => (
                <Badge key={alt} variant="outline" className="text-xs" dir="auto">
                  {alt}
                </Badge>
              ))}
            </div>
          )}
          {term.language && (
            <span className="text-xs text-muted-foreground uppercase">
              {term.language}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function JargonGlossarySheet({
  lessonId,
  className,
}: JargonGlossarySheetProps) {
  const [search, setSearch] = useState('');

  // Step 1: detect domains for this lesson (if lessonId provided)
  const [lessonDomainsResult] = useQuery({
    query: DETECT_LESSON_DOMAINS_QUERY,
    variables: { lessonId: lessonId ?? '' },
    pause: !lessonId,
  });

  // Step 2: fetch all tenant domains as fallback
  const [allDomainsResult] = useQuery({
    query: JARGON_DOMAINS_QUERY,
    variables: {},
    pause: !!lessonId,
  });

  // Resolve first domain ID to query
  const detectedDomains =
    lessonDomainsResult.data?.detectLessonDomains?.domains ?? [];
  const allDomains = allDomainsResult.data?.jargonDomains ?? [];
  const primaryDomainId: string | null =
    detectedDomains[0]?.domain?.id ?? allDomains[0]?.id ?? null;

  // Step 3: fetch terms for the primary domain
  const [termsResult] = useQuery({
    query: JARGON_TERMS_QUERY,
    variables: {
      domainId: primaryDomainId ?? '',
      search: search.length >= 2 ? search : undefined,
      limit: 100,
    },
    pause: !primaryDomainId,
  });

  // Client-side filter for instant feedback on short queries
  const filtered = useMemo(() => {
    const terms: JargonTerm[] = termsResult.data?.jargonTerms ?? [];
    if (!search.trim()) return terms;
    const q = search.toLowerCase();
    return terms.filter(
      (t) =>
        t.canonicalForm.toLowerCase().includes(q) ||
        t.definitionShort?.toLowerCase().includes(q)
    );
  }, [termsResult.data, search]);

  const isLoading =
    lessonDomainsResult.fetching ||
    allDomainsResult.fetching ||
    termsResult.fetching;

  return (
    <div
      className={cn('flex flex-col h-full overflow-hidden', className)}
      data-testid="jargon-glossary-sheet"
    >
      {/* Search bar */}
      <div className="shrink-0 p-3 border-b">
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חפש מונח…"
            className="pl-8 text-sm h-8"
            dir="auto"
            aria-label="Search glossary"
            data-testid="glossary-search"
          />
        </div>
      </div>

      {/* Term list */}
      <div className="flex-1 overflow-y-auto px-3">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <p>Loading glossary…</p>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div
            className="flex items-center justify-center py-12 text-muted-foreground text-sm"
            data-testid="glossary-empty"
          >
            <p dir="auto">
              {search ? 'לא נמצאו מונחים.' : 'No terms available.'}
            </p>
          </div>
        )}

        {!isLoading &&
          filtered.map((term) => <TermRow key={term.id} term={term} />)}
      </div>
    </div>
  );
}
