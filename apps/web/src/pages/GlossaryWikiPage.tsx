/**
 * GlossaryWikiPage — public glossary for learners.
 *
 * Routes:
 *   /glossary          → list view (search + domain filter + term grid)
 *   /glossary/:termId  → detail view (wiki, lesson refs, related terms)
 */
import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from 'urql';
import { useTranslation } from 'react-i18next';
import { Search, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PageShell } from '@/components/PageShell';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { JARGON_DOMAINS_QUERY } from '@/lib/graphql/jargon.queries';
import {
  GLOSSARY_SEARCH_QUERY,
  GLOSSARY_ENTRIES_QUERY,
  GLOSSARY_WIKI_ENTRY_QUERY,
} from '@/lib/graphql/glossary.queries';
import type { JargonTerm, JargonDomain } from '@/types/jargon.types';
import { GlossaryTermGrid } from './GlossaryWikiPage.grid';
import { GlossaryTermDetail } from './GlossaryWikiPage.detail';

const DEFAULT_LIMIT = 48;

// ── List View ──────────────────────────────────────────────────────────────────

function GlossaryListView() {
  const { t } = useTranslation('glossary');
  const [searchParams, setSearchParams] = useSearchParams();
  const [mounted, setMounted] = useState(false);

  const searchQ = searchParams.get('q') ?? '';
  const domainId = searchParams.get('domain') ?? '';

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data: domainsData, fetching: domainsFetching }] = useQuery<{
    jargonDomains: JargonDomain[];
  }>({ query: JARGON_DOMAINS_QUERY, pause: !mounted });

  const isSearch = searchQ.trim().length > 0;

  const [{ data: termsData, fetching: termsFetching }] = useQuery<{
    jargonTerms: JargonTerm[];
  }>({
    query: isSearch ? GLOSSARY_SEARCH_QUERY : GLOSSARY_ENTRIES_QUERY,
    variables: isSearch
      ? {
          search: searchQ,
          domainId: domainId || undefined,
          limit: DEFAULT_LIMIT,
        }
      : { domainId: domainId || 'all', limit: DEFAULT_LIMIT },
    pause: !mounted || (!isSearch && !domainId),
  });

  const domains = domainsData?.jargonDomains ?? [];
  const terms = termsData?.jargonTerms ?? [];

  return (
    <PageShell size="2xl">
      <PageHeader
        title={t('title', 'Glossary')}
        description={t(
          'description',
          'Browse and search domain terms and definitions.'
        )}
      />

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('searchPlaceholder', 'Search terms…')}
            value={searchQ}
            onChange={(e) =>
              setSearchParams((p) => {
                p.set('q', e.target.value);
                return p;
              })
            }
            dir="auto"
          />
        </div>

        {!domainsFetching && (
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={domainId}
            onChange={(e) =>
              setSearchParams((p) => {
                p.set('domain', e.target.value);
                return p;
              })
            }
          >
            <option value="">{t('allDomains', 'All domains')}</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {termsFetching ? (
        <LoadingSpinner containerHeight="py-12" />
      ) : (
        <GlossaryTermGrid terms={terms} />
      )}
    </PageShell>
  );
}

// ── Detail View ────────────────────────────────────────────────────────────────

function GlossaryDetailView({ termId }: { termId: string }) {
  const { t } = useTranslation('glossary');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }] = useQuery({
    query: GLOSSARY_WIKI_ENTRY_QUERY,
    variables: { termId },
    pause: !mounted,
  });

  const entry = data?.jargonTermWiki ?? null;

  return (
    <PageShell size="xl">
      <Link
        to="/glossary"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backToGlossary', 'Back to glossary')}
      </Link>

      {fetching ? (
        <LoadingSpinner containerHeight="py-12" />
      ) : entry ? (
        <GlossaryTermDetail entry={entry} />
      ) : (
        <p className="text-muted-foreground text-sm">
          {t('termNotFound', 'Term not found.')}
        </p>
      )}
    </PageShell>
  );
}

// ── Page Router ────────────────────────────────────────────────────────────────

export function GlossaryWikiPage() {
  const { termId } = useParams<{ termId?: string }>();
  return termId ? <GlossaryDetailView termId={termId} /> : <GlossaryListView />;
}
