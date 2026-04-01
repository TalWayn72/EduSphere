import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ChevronRight } from 'lucide-react';
import { TYPE_CONFIG } from './search.constants';
import { Highlight } from './Highlight';
import type { SearchResult } from './search.types';

interface SearchResultCardProps {
  result: SearchResult;
  query: string;
}

export const SearchResultCard = React.memo(function SearchResultCard({
  result,
  query,
}: SearchResultCardProps) {
  const navigate = useNavigate();
  const config = TYPE_CONFIG[result.type];

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow border ${config.bg}`}
      onClick={() => result.href && navigate(result.href)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${config.color} truncate`}>
              <Highlight text={result.title} query={query} />
            </p>
            <p className="text-sm text-foreground/80 mt-0.5 line-clamp-2">
              <Highlight text={result.snippet} query={query} />
            </p>
            {result.meta && (
              <div className="flex items-center gap-1 mt-1.5">
                {result.timestamp !== undefined ? (
                  <Clock className="h-3 w-3 text-muted-foreground" />
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {result.meta}
                </span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
