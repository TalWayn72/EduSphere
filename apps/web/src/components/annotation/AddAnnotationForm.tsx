/**
 * AddAnnotationForm — mini inline form for capturing a new video annotation.
 * Floats above the timeline. Ctrl+Enter saves, Escape cancels.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface AddAnnotationFormProps {
  currentTime: number;
  onSave: (text: string, timestamp: number) => void;
  onCancel: () => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function AddAnnotationForm({
  currentTime,
  onSave,
  onCancel,
}: AddAnnotationFormProps) {
  const [text, setText] = useState('');
  // Capture timestamp at form-open moment (currentTime may advance while form is open)
  const capturedTime = currentTime;

  const handleSave = () => {
    if (text.trim()) onSave(text.trim(), capturedTime);
  };

  return (
    <div className="absolute bottom-10 right-3 z-40 w-64 bg-white border rounded-lg shadow-xl p-3 space-y-2 text-sm">
      <p className="text-xs text-muted-foreground font-medium">
        Note at {formatTime(capturedTime)}
      </p>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="Add a note… (Ctrl+Enter to save)"
        className="w-full px-2 py-1.5 border rounded-md bg-background resize-none text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        rows={3}
        aria-label="Annotation text input"
      />
      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleSave}
          disabled={!text.trim()}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
