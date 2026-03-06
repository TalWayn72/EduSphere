/**
 * VideoSketchToolbar — tool selector, color picker, and action buttons for VideoSketchOverlay.
 */
import { Pencil, Eraser, Square, ArrowUpRight, Circle, Type, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DrawingTool } from './useSketchCanvas';

interface Props {
  tool: DrawingTool;
  color: string;
  saving: boolean;
  onToolChange: (t: DrawingTool) => void;
  onColorChange: (c: string) => void;
  onClear: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const TOOLS: { id: DrawingTool; Icon: React.ElementType; label: string }[] = [
  { id: 'freehand', Icon: Pencil, label: 'Freehand' },
  { id: 'eraser',   Icon: Eraser,         label: 'Eraser' },
  { id: 'rect',     Icon: Square,         label: 'Rectangle' },
  { id: 'arrow',    Icon: ArrowUpRight,   label: 'Arrow' },
  { id: 'ellipse',  Icon: Circle,         label: 'Ellipse' },
  { id: 'text',     Icon: Type,           label: 'Text' },
];

export function VideoSketchToolbar({
  tool, color, saving,
  onToolChange, onColorChange, onClear, onSave, onCancel,
}: Props) {
  return (
    <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5" data-testid="sketch-toolbar">
      {/* Tool + color row */}
      <div className="flex items-center gap-0.5 bg-black/70 rounded p-1">
        {TOOLS.map(({ id, Icon, label }) => (
          <button
            key={id}
            className={cn(
              'p-1.5 rounded text-white transition-colors',
              tool === id ? 'bg-indigo-600' : 'hover:bg-white/20'
            )}
            onClick={() => onToolChange(id)}
            aria-label={label}
            aria-pressed={tool === id}
            data-testid={`sketch-tool-${id}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}

        {/* Color picker */}
        <label className="relative cursor-pointer ml-1" aria-label="Stroke color">
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            data-testid="sketch-color-picker"
          />
          <div
            className="h-5 w-5 rounded border-2 border-white/70 pointer-events-none"
            style={{ backgroundColor: color }}
            data-testid="sketch-color-swatch"
          />
        </label>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          className={cn('h-7 px-2 text-[11px] bg-black/60 text-white hover:bg-black/80', saving && 'opacity-50')}
          onClick={onClear}
          disabled={saving}
          aria-label="Clear sketch"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear
        </Button>
        <Button
          size="sm"
          className="h-7 px-2 text-[11px] bg-green-600 hover:bg-green-700 text-white"
          onClick={onSave}
          disabled={saving}
          aria-label="Save sketch annotation"
          data-testid="sketch-save-btn"
        >
          <Check className="h-3 w-3 mr-1" />
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px] bg-black/60 text-white hover:bg-black/80"
          onClick={onCancel}
          aria-label="Cancel sketch"
          data-testid="sketch-cancel-btn"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
