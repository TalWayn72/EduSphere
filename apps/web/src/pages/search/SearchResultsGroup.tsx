import React, { useMemo } from 'react';
import { TYPE_CONFIG, TYPE_ORDER } from './search.constants';
import { SearchResultCard } from './SearchResultCard';
import type { ResultType, SearchResult } from './search.types';

interface SearchResultsGroupProps {
  results: SearchResult[];
  query: string;
}

export const SearchResultsGroup = React.memo(function SearchResultsGroup({ results, query }: SearchResultsGroupProps) {
  const grouped = useMemo(
    () => results.reduce<Partial<Record<ResultType, SearchResult[]>>>(
      (acc, r) => {
        (acc[r.type] ??= []).push(r);
        return acc;
      },
      {}
    ),
    [results],
  );

  return (
    <>
      {TYPE_ORDER.map((type) => {
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
                <SearchResultCard key={r.id} result={r} query={query} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
});
