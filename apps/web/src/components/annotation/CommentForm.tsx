/**
 * CommentForm — floating form for submitting a new text-range annotation.
 * Appears at viewport-relative coordinates.
 * Ctrl+Enter saves, Escape cancels.
 */
import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ANNOTATION_LAYER_CONFIGS, AnnotationLayer } from '@/types/annotations';

interface CommentFormProps {
  position: { x: number; y: number };
  onSubmit: (text: string, layer: AnnotationLayer) => void;
  onCancel: () => void;
  defaultLayer?: AnnotationLayer;
}

export function CommentForm({
  position,
  onSubmit,
  onCancel,
  defaultLayer = AnnotationLayer.PERSONAL,
}: CommentFormProps) {
  const [text, setText] = useState('');
  const [layer, setLayer] = useState<AnnotationLayer>(defaultLayer);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && text.trim()) {
        onSubmit(text.trim(), layer);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [text, layer, onSubmit, onCancel]);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim(), layer);
  };

  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(position.y, window.innerHeight - 280),
    left: Math.min(position.x, window.innerWidth - 300),
    zIndex: 50,
  };

  return (
    <div
      role="dialog"
      aria-label="Add comment"
      style={style}
      className="w-72 rounded-lg border border-border bg-card shadow-xl p-3 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-foreground">New Comment</span>
        <button
          aria-label="Close"
          className="rounded p-0.5 hover:bg-accent text-muted-foreground"
          onClick={onCancel}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment… (Ctrl+Enter to save)"
        rows={3}
        className="w-full resize-none rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />

      <select
        value={layer}
        onChange={(e) => setLayer(e.target.value as AnnotationLayer)}
        className="w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {Object.values(AnnotationLayer).map((l) => (
          <option key={l} value={l}>
            {ANNOTATION_LAYER_CONFIGS[l].icon} {ANNOTATION_LAYER_CONFIGS[l].label}
          </option>
        ))}
      </select>

      <div className="flex justify-end gap-1.5 mt-1">
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={!text.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}
