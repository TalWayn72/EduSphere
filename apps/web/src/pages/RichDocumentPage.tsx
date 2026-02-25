import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { RichContentViewer } from '@/components/editor/RichContentViewer';
import { CONTENT_ITEM_QUERY } from '@/lib/graphql/content.queries';
import { AlertCircle } from 'lucide-react';

interface ContentItemResult {
  contentItem: {
    id: string;
    title: string;
    contentType: string;
    content: string | null;
  } | null;
}

function SkeletonBlock() {
  return <div className="bg-muted animate-pulse rounded h-4 w-full" aria-hidden="true" />;
}

export function RichDocumentPage() {
  const { contentId = '' } = useParams<{ contentId: string }>();

  const [result] = useQuery<ContentItemResult>({
    query: CONTENT_ITEM_QUERY,
    variables: { id: contentId },
    pause: !contentId,
  });

  const item = result.data?.contentItem;
  const fetching = result.fetching;
  const hasError = !!result.error;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-6 space-y-4">
        {fetching && (
          <div className="space-y-3">
            <div className="bg-muted animate-pulse rounded h-8 w-1/2" aria-hidden="true" />
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} />
            ))}
          </div>
        )}

        {hasError && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Failed to load document. Please try again.
          </div>
        )}

        {item && (
          <>
            <h1 className="text-2xl font-bold">{item.title}</h1>
            <Card>
              <CardContent className="p-0">
                {item.contentType === 'RICH_DOCUMENT' && item.content ? (
                  <RichContentViewer content={item.content} />
                ) : (
                  <p className="p-6 text-muted-foreground text-sm">No content available.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
