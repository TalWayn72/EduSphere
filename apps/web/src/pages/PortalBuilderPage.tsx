/**
 * PortalBuilderPage — F-037 No-Code Custom Portal Builder (Admin)
 * Route: /admin/portal
 * Two-panel: left = block palette, right = canvas drop zone.
 * TOP toolbar: title input, Save Draft + Publish/Unpublish buttons.
 */
import { useState, useCallback } from 'react';
import { useMutation, useQuery } from 'urql';
import { toast } from 'sonner';
import { BlockPalette } from '@/components/portal-builder/BlockPalette';
import { CanvasDropZone } from '@/components/portal-builder/CanvasDropZone';
import type { PortalBlock, BlockType } from '@/components/portal-builder/types';
import {
  MY_PORTAL_QUERY,
  SAVE_PORTAL_LAYOUT_MUTATION,
  PUBLISH_PORTAL_MUTATION,
  UNPUBLISH_PORTAL_MUTATION,
} from '@/lib/graphql/portal.queries';

function createBlock(type: BlockType, order: number): PortalBlock {
  return { id: crypto.randomUUID(), type, order, config: {} };
}

function parseServerBlocks(
  raw: Array<{ id: string; type: string; order: number; config: string }>
): PortalBlock[] {
  return raw.map((b) => ({
    id: b.id,
    type: b.type as BlockType,
    order: b.order,
    config: (() => {
      try {
        return JSON.parse(b.config) as Record<string, unknown>;
      } catch {
        return {};
      }
    })(),
  }));
}

export function PortalBuilderPage() {
  const [{ data }] = useQuery({ query: MY_PORTAL_QUERY });
  const [, saveMutation] = useMutation(SAVE_PORTAL_LAYOUT_MUTATION);
  const [, publishMutation] = useMutation(PUBLISH_PORTAL_MUTATION);
  const [, unpublishMutation] = useMutation(UNPUBLISH_PORTAL_MUTATION);

  const serverPortal = data?.myPortal as
    | {
        title: string;
        published: boolean;
        blocks: Array<{
          id: string;
          type: string;
          order: number;
          config: string;
        }>;
      }
    | undefined;

  const [title, setTitle] = useState<string>(
    serverPortal?.title ?? 'Learning Portal'
  );
  const [blocks, setBlocks] = useState<PortalBlock[]>(() =>
    serverPortal?.blocks ? parseServerBlocks(serverPortal.blocks) : []
  );
  const [saving, setSaving] = useState(false);

  const handleDrop = useCallback((type: BlockType) => {
    setBlocks((prev) => [...prev, createBlock(type, prev.length)]);
  }, []);

  const handleRemove = useCallback((blockId: string) => {
    setBlocks((prev) =>
      prev.filter((b) => b.id !== blockId).map((b, i) => ({ ...b, order: i }))
    );
  }, []);

  const handleReorder = useCallback((fromIdx: number, toIdx: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      if (!moved) return prev;
      next.splice(toIdx, 0, moved);
      return next.map((b, i) => ({ ...b, order: i }));
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const result = await saveMutation({
      title,
      blocksJson: JSON.stringify(blocks),
    });
    setSaving(false);
    if (result.error) {
      toast.error('Failed to save portal');
      return;
    }
    toast.success('Portal draft saved');
  };

  const handlePublish = async () => {
    const result = await publishMutation({});
    if (result.error) {
      toast.error('Failed to publish portal');
      return;
    }
    toast.success('Portal published');
  };

  const handleUnpublish = async () => {
    const result = await unpublishMutation({});
    if (result.error) {
      toast.error('Failed to unpublish portal');
      return;
    }
    toast.success('Portal unpublished');
  };

  const isPublished = serverPortal?.published ?? false;

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <header className="flex items-center gap-3 px-6 py-3 border-b bg-background shrink-0">
        <input
          className="flex-1 text-lg font-semibold bg-transparent border-none outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Portal title"
          placeholder="Portal title..."
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          onClick={isPublished ? handleUnpublish : handlePublish}
          className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          {isPublished ? 'Unpublish' : 'Publish'}
        </button>
      </header>

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden">
        <BlockPalette />
        <main className="flex-1 p-6 overflow-y-auto bg-muted/10">
          <CanvasDropZone
            blocks={blocks}
            onDrop={handleDrop}
            onRemove={handleRemove}
            onReorder={handleReorder}
          />
        </main>
      </div>
    </div>
  );
}
