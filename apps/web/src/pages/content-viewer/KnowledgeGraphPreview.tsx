/** Knowledge graph preview card with graph nodes + search tab. */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Network, Search, ChevronRight } from 'lucide-react';
import { Annotation } from '@/types/annotations';
import { mockGraphData } from '@/lib/mock-graph-data';

export interface KnowledgeGraphPreviewProps {
  searchQuery: string;
  transcript: Array<{ id: string; startTime: number; text: string }>;
  annotations: Annotation[];
  onSearchChange: (value: string) => void;
  onSeek: (time: number) => void;
}

export function KnowledgeGraphPreview({
  searchQuery,
  transcript,
  annotations,
  onSearchChange,
  onSeek,
}: KnowledgeGraphPreviewProps) {
  const { t } = useTranslation(['content', 'common']);

  return (
    <Card className="flex-shrink-0">
      <Tabs defaultValue="graph">
        <TabsList className="w-full rounded-none border-b bg-transparent px-2 h-9">
          <TabsTrigger value="graph" className="text-xs flex-1">
            <Network className="h-3 w-3 mr-1" />
            {t('common:graph')}
          </TabsTrigger>
          <TabsTrigger value="search" className="text-xs flex-1">
            <Search className="h-3 w-3 mr-1" />
            {t('common:search')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="graph" className="m-0 px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            {mockGraphData.nodes.slice(0, 4).map((node) => (
              <div
                key={node.id}
                className="p-2 border rounded-md text-xs hover:bg-muted/50 cursor-pointer flex items-center gap-1.5"
              >
                <span
                  className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    node.type === 'CONCEPT'
                      ? 'bg-blue-500'
                      : node.type === 'PERSON'
                        ? 'bg-green-500'
                        : node.type === 'SOURCE'
                          ? 'bg-purple-500'
                          : 'bg-orange-500'
                  }`}
                />
                <span className="truncate font-medium">{node.label}</span>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-2 text-xs h-7">
            {t('content:exploreFullGraph')}{' '}
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </TabsContent>
        <TabsContent value="search" className="m-0 px-4 py-3 space-y-2">
          <div className="flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('content:searchTranscript')}
              className="flex-1 text-xs px-3 py-1.5 border rounded-md bg-background"
            />
            <Button
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onSearchChange('')}
            >
              <Search className="h-3 w-3" />
            </Button>
          </div>
          {searchQuery.trim().length > 1 ? (
            <SearchResults
              searchQuery={searchQuery}
              transcript={transcript}
              annotations={annotations}
              onSeek={onSeek}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              {t('content:searchTranscriptHint')}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

// ── Search results ────────────────────────────────────────────────────────────

interface SearchResultsProps {
  searchQuery: string;
  transcript: Array<{ id: string; startTime: number; text: string }>;
  annotations: Annotation[];
  onSeek: (time: number) => void;
}

function SearchResults({
  searchQuery,
  transcript,
  annotations,
  onSeek,
}: SearchResultsProps) {
  const results = [
    ...transcript
      .filter((s) => s.text.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((s) => ({
        type: 'transcript' as const,
        id: s.id,
        text: s.text,
        ts: s.startTime,
      })),
    ...annotations
      .filter((a) =>
        a.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map((a) => ({
        type: 'annotation' as const,
        id: a.id,
        text: a.content,
        ts: a.contentTimestamp,
      })),
    ...mockGraphData.nodes
      .filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((n) => ({
        type: 'concept' as const,
        id: n.id,
        text: n.label,
        ts: undefined as number | undefined,
      })),
  ];

  return (
    <div className="space-y-1 max-h-32 overflow-y-auto">
      {results.map((r) => (
        <div
          key={r.id}
          onClick={() => r.ts !== undefined && onSeek(r.ts)}
          className="text-xs p-1.5 rounded border bg-muted/30 cursor-pointer hover:bg-muted/60 truncate"
        >
          <span className="font-medium text-muted-foreground mr-1">
            {r.type === 'transcript'
              ? '\ud83d\udcdd'
              : r.type === 'annotation'
                ? '\ud83d\udcac'
                : '\ud83d\udd35'}
          </span>
          {r.text}
        </div>
      ))}
    </div>
  );
}
