/**
 * PortalPage — F-037 Public portal viewer (learner-facing).
 * Route: /portal (no auth required — public page)
 * Fetches publicPortal query. If portal not published → redirect to /courses.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { BlockRenderer } from '@/components/portal-builder/blocks/BlockRenderer';
import type { PortalBlock, BlockType } from '@/components/portal-builder/types';
import { PUBLIC_PORTAL_QUERY } from '@/lib/graphql/portal.queries';

interface RawBlock {
  id: string;
  type: string;
  order: number;
  config: string;
}

function parseBlocks(raw: RawBlock[]): PortalBlock[] {
  return raw
    .map((b) => ({
      id: b.id,
      type: b.type as BlockType,
      order: b.order,
      config: (() => {
        try { return JSON.parse(b.config) as Record<string, unknown>; }
        catch { return {}; }
      })(),
    }))
    .sort((a, b) => a.order - b.order);
}

export function PortalPage() {
  const navigate = useNavigate();
  const [{ data, fetching, error }] = useQuery({ query: PUBLIC_PORTAL_QUERY });

  useEffect(() => {
    // If portal is definitely not published or not found → redirect
    if (!fetching && !error && !data?.publicPortal) {
      void navigate('/courses', { replace: true });
    }
  }, [fetching, error, data, navigate]);

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !data?.publicPortal) {
    return null; // redirect handled by useEffect
  }

  const portal = data.publicPortal;
  const blocks = parseBlocks((portal.blocks ?? []) as RawBlock[]);

  return (
    <main className="min-h-screen bg-background" aria-label="Learning portal">
      <div className="flex flex-col">
        {blocks.map((block) => (
          <section key={block.id} aria-label={`${block.type} section`}>
            <BlockRenderer block={block} />
          </section>
        ))}
        {blocks.length === 0 && (
          <div className="flex items-center justify-center min-h-64 text-muted-foreground text-sm">
            Portal is being set up. Check back soon.
          </div>
        )}
      </div>
    </main>
  );
}
