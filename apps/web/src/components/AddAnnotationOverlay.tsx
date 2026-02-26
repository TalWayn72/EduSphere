/**
 * AddAnnotationOverlay — floating button overlaid on the video player.
 * Shows "Add Note at [M:SS]" button; clicking opens a mini-form (textarea + layer selector).
 * On submit, calls onSave(content, layer) so the parent can add to local annotation state.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AnnotationLayer } from '@/types/annotations';
import { LAYER_META, formatTime } from '@/pages/content-viewer.utils';

interface AddAnnotationOverlayProps {
  /** Current video position in seconds */
  currentTime: number;
  /** Called when the user submits a new annotation */
  onSave: (content: string, layer: AnnotationLayer, timestamp: number) => void;
}

const CREATABLE_LAYERS: AnnotationLayer[] = [
  AnnotationLayer.PERSONAL,
  AnnotationLayer.SHARED,
];

export function AddAnnotationOverlay({
  currentTime,
  onSave,
}: AddAnnotationOverlayProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [layer, setLayer] = useState<AnnotationLayer>(AnnotationLayer.PERSONAL);
  /** Capture the timestamp at the moment the form opens */
  const [capturedTime, setCapturedTime] = useState(0);

  const handleOpen = () => {
    setCapturedTime(currentTime);
    setContent('');
    setLayer(AnnotationLayer.PERSONAL);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSave(content.trim(), layer, capturedTime);
    setContent('');
    setOpen(false);
  };

  const handleCancel = () => {
    setContent('');
    setOpen(false);
  };

  return (
    <div className="absolute bottom-12 right-3 z-30">
      {!open ? (
        <Button
          size="sm"
          variant="secondary"
          className="h-7 text-xs shadow-md opacity-80 hover:opacity-100 transition-opacity"
          onClick={handleOpen}
          title="Add annotation at current video time"
        >
          Add Note @ {formatTime(currentTime)}
        </Button>
      ) : (
        <div className="w-72 bg-white border rounded-lg shadow-xl p-3 space-y-2 text-sm">
          {/* Timestamp label */}
          <p className="text-xs text-muted-foreground font-medium">
            Note at {formatTime(capturedTime)}
          </p>

          {/* Layer selector */}
          <div className="flex gap-1 flex-wrap">
            {CREATABLE_LAYERS.map((l) => (
              <button
                key={l}
                onClick={() => setLayer(l)}
                className={`px-2 py-0.5 rounded-full text-xs border transition-all
                  ${LAYER_META[l]?.bg ?? ''} ${LAYER_META[l]?.color ?? ''}
                  ${layer === l ? 'ring-2 ring-offset-1 ring-primary' : 'opacity-60 hover:opacity-90'}`}
              >
                {LAYER_META[l]?.label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
              if (e.key === 'Escape') handleCancel();
            }}
            placeholder="Type your note... (Ctrl+Enter to save)"
            className="w-full text-sm px-2 py-1.5 border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            rows={3}
          />

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSubmit}
              disabled={!content.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
