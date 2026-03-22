import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Search as SearchIcon,
  Loader2,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { DEV_MODE } from '@/lib/auth';
import { useSearchQuery } from './useSearchQuery';
import { useSavedSearches } from './useSavedSearches';
import { SearchResultsGroup } from './SearchResultsGroup';
import { SaveSearchModal } from './SaveSearchModal';
import { SavedSearchesPanel } from './SavedSearchesPanel';
import { SUGGESTED_QUERIES } from './search.constants';

export function SearchPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    inputValue,
    setInputValue,
    query,
    results,
    loading,
    isOfflineFallback,
  } = useSearchQuery();

  const {
    savedSearches,
    showSaveModal,
    setShowSaveModal,
    savedSearchName,
    setSavedSearchName,
    savingSearch,
    showSavedPanel,
    setShowSavedPanel,
    handleSaveSearch,
    handleDeleteSavedSearch,
    handleLoadSavedSearch,
    openSaveModal,
  } = useSavedSearches(query);

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Layout>
      <PageShell size="lg">
      <PageHeader title="Search" className="sr-only" />
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
          {query.length >= 2 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              title={t('saveSearch', 'Save Search')}
              data-testid="save-search-btn"
              onClick={() => openSaveModal(query)}
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

        {/* Offline fallback banner */}
        {isOfflineFallback && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200"
          >
            <span
              className="inline-block h-2 w-2 rounded-full bg-amber-400 flex-shrink-0 dark:bg-amber-500"
              aria-hidden="true"
            />
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
            <p className="text-muted-foreground">{t('searchHint')}</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {SUGGESTED_QUERIES.map((s) => (
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
        {!loading && (
          <SearchResultsGroup results={results} query={query} />
        )}

        {DEV_MODE && query.length >= 2 && (
          <p className="text-xs text-center text-muted-foreground pb-4">
            Dev Mode — mock search results. Set VITE_DEV_MODE=false for live
            semantic search.
          </p>
        )}
      </div>

      {/* Save Search Modal */}
      {showSaveModal && (
        <SaveSearchModal
          name={savedSearchName}
          onNameChange={setSavedSearchName}
          onSave={() => void handleSaveSearch()}
          onClose={() => setShowSaveModal(false)}
          saving={savingSearch}
        />
      )}

      {/* Saved Searches Sidebar Panel */}
      {showSavedPanel && (
        <SavedSearchesPanel
          savedSearches={savedSearches}
          onLoad={handleLoadSavedSearch}
          onDelete={(id) => void handleDeleteSavedSearch(id)}
          onClose={() => setShowSavedPanel(false)}
        />
      )}
      </PageShell>
    </Layout>
  );
}
