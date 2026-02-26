import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnnotationLayer } from '@/types/annotations';
import type { SelectionPosition } from './AnnotatedDocumentViewer';

const LAYER_OPTIONS = [
  { value: AnnotationLayer.PERSONAL, label: 'Private' },
  { value: AnnotationLayer.SHARED, label: 'Public' },
  { value: AnnotationLayer.INSTRUCTOR, label: 'Authority (instructor only)' },
];

interface Props {
  position: SelectionPosition | null;
  defaultLayer: AnnotationLayer;
  onSubmit: (text: string, layer: AnnotationLayer) => void;
  onCancel: () => void;
}

export function CommentForm({
  position,
  defaultLayer,
  onSubmit,
  onCancel,
}: Props) {
  const [text, setText] = useState('');
  const [layer, setLayer] = useState<AnnotationLayer>(defaultLayer);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && text.trim()) {
        onSubmit(text.trim(), layer);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [text, layer, onSubmit, onCancel]);

  if (!position) return null;

  // Clamp position to viewport
  const top = Math.max(8, Math.min(position.y - 200, window.innerHeight - 220));
  const left = Math.max(8, Math.min(position.x, window.innerWidth - 288));

  return (
    <div
      className="fixed z-50 w-72 rounded-lg border bg-popover shadow-xl p-3"
      style={{ top, left }}
      data-testid="comment-form"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">
          Add Comment
        </span>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your comment…"
        rows={4}
        className="w-full resize-none rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring mb-2"
      />

      <div className="flex items-center gap-2 mb-2">
        <label className="text-xs text-muted-foreground shrink-0">Layer:</label>
        <select
          value={layer}
          onChange={(e) => setLayer(e.target.value as AnnotationLayer)}
          className="flex-1 rounded border bg-background px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {LAYER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!text.trim()}
          onClick={() => onSubmit(text.trim(), layer)}
        >
          Save
        </Button>
      </div>

      <p className="mt-1.5 text-[10px] text-muted-foreground text-right">
        Ctrl+Enter to save · Esc to cancel
      </p>
    </div>
  );
}
