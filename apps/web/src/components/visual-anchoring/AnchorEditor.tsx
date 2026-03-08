/**
 * AnchorEditor — wraps a document viewer in instructor mode.
 * Detects text selection → shows floating "Create Anchor" toolbar →
 * opens anchor creation modal with optional asset assignment.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CREATE_VISUAL_ANCHOR } from './visual-anchor.graphql';
import type { SelectionInfo, VisualAnchor } from './visual-anchor.types';
import AssetPicker from './AssetPicker';

interface AnchorEditorProps {
  mediaAssetId: string;
  courseId: string;
  children: React.ReactNode;
  onAnchorCreated: (anchor: VisualAnchor) => void;
  existingAnchorCount: number;
}

export default function AnchorEditor({
  mediaAssetId,
  courseId,
  children,
  onAnchorCreated,
  existingAnchorCount,
}: AnchorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [anchorCreatedAnnouncement, setAnchorCreatedAnnouncement] = useState('');
  const [{ fetching: isCreating }, createAnchor] = useMutation(CREATE_VISUAL_ANCHOR);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setToolbarPos(null);
      setSelection(null);
      return;
    }
    const text = sel.toString().trim();
    if (!text) {
      setToolbarPos(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const posX = (rect.left - containerRect.left) / containerRect.width;
    const posY = (rect.top - containerRect.top) / containerRect.height;
    const posW = rect.width / containerRect.width;
    const posH = rect.height / containerRect.height;

    setSelection({ text, pageNumber: 1, posX, posY, posW, posH, containerRect });
    setToolbarPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('touchend', handleMouseUp);
    return () => {
      el.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseUp]);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedAssetId(null);
  }, []);

  const handleCreateAnchor = useCallback(async () => {
    if (!selection) return;
    const result = await createAnchor({
      input: {
        mediaAssetId,
        courseId,
        anchorText: selection.text,
        pageNumber: selection.pageNumber,
        posX: selection.posX,
        posY: selection.posY,
        posW: selection.posW,
        posH: selection.posH,
        visualAssetId: selectedAssetId ?? undefined,
        documentOrder: existingAnchorCount,
      },
    });
    if (result.data?.createVisualAnchor) {
      onAnchorCreated(result.data.createVisualAnchor as VisualAnchor);
      setAnchorCreatedAnnouncement('עוגן חזותי נוצר בהצלחה');
      setIsModalOpen(false);
      setSelection(null);
      setToolbarPos(null);
      setSelectedAssetId(null);
      window.getSelection()?.removeAllRanges();
    } else if (result.error) {
      setAnchorCreatedAnnouncement('שגיאה ביצירת עוגן חזותי. אנא נסה שוב.');
    }
  }, [
    selection,
    createAnchor,
    mediaAssetId,
    courseId,
    selectedAssetId,
    existingAnchorCount,
    onAnchorCreated,
  ]);

  return (
    <div ref={containerRef} className="relative" data-testid="anchor-editor">
      {/* Screen-reader live region for anchor creation results */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        data-testid="anchor-editor-announcement"
      >
        {anchorCreatedAnnouncement}
      </div>

      {children}

      {toolbarPos && (
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-full"
          style={{ left: toolbarPos.x, top: toolbarPos.y }}
        >
          <Button
            size="sm"
            variant="default"
            onClick={handleOpenModal}
            aria-haspopup="dialog"
            aria-label="צור עוגן חזותי לטקסט המסומן"
            data-testid="create-anchor-btn"
          >
            + Create Anchor
          </Button>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl" data-testid="anchor-creation-modal">
          <DialogHeader>
            <DialogTitle>Create Visual Anchor</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium text-foreground mb-1">Selected text:</p>
              <p className="text-muted-foreground italic line-clamp-3">
                &ldquo;{selection?.text}&rdquo;
              </p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Assign an image (optional):</p>
              <AssetPicker
                courseId={courseId}
                selectedAssetId={selectedAssetId}
                onSelect={setSelectedAssetId}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal} aria-label="בטל יצירת עוגן">
              Cancel
            </Button>
            <Button
              onClick={handleCreateAnchor}
              disabled={isCreating}
              aria-disabled={isCreating}
              aria-label={isCreating ? 'יוצר עוגן…' : 'אשר יצירת עוגן חזותי'}
              data-testid="confirm-anchor-btn"
            >
              {isCreating ? 'Creating…' : 'Create Anchor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
