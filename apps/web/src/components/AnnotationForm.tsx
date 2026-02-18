import { useState } from 'react';
import { AnnotationLayer, ANNOTATION_LAYER_CONFIGS } from '@/types/annotations';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AnnotationFormProps {
  userRole: 'student' | 'instructor' | 'ai';
  contentTimestamp?: number;
  parentId?: string;
  onSubmit: (content: string, layer: AnnotationLayer, timestamp?: number) => void;
  onCancel: () => void;
}

export function AnnotationForm({
  userRole,
  contentTimestamp,
  parentId,
  onSubmit,
  onCancel,
}: AnnotationFormProps) {
  const [content, setContent] = useState('');
  const [selectedLayer, setSelectedLayer] = useState<AnnotationLayer>(
    userRole === 'instructor' ? AnnotationLayer.INSTRUCTOR : AnnotationLayer.PERSONAL
  );
  const [timestamp, setTimestamp] = useState(contentTimestamp ? formatTimestamp(contentTimestamp) : '');

  // Get available layers based on user role
  const availableLayers = Object.values(AnnotationLayer).filter((layer) => {
    const config = ANNOTATION_LAYER_CONFIGS[layer];
    return config.canCreate(userRole);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const timestampSeconds = timestamp ? parseTimestamp(timestamp) : contentTimestamp;
    onSubmit(content, selectedLayer, timestampSeconds);
    setContent('');
    setTimestamp('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      <div>
        <Label htmlFor="content" className="text-sm font-medium">
          {parentId ? 'Add Reply' : 'Add Annotation'}
        </Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={parentId ? 'Write your reply...' : 'Write your annotation...'}
          className="mt-1 min-h-[100px]"
          required
        />
      </div>

      {!parentId && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="layer" className="text-sm font-medium">
              Layer
            </Label>
            <Select value={selectedLayer} onValueChange={(value) => setSelectedLayer(value as AnnotationLayer)}>
              <SelectTrigger id="layer" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableLayers.map((layer) => {
                  const config = ANNOTATION_LAYER_CONFIGS[layer];
                  return (
                    <SelectItem key={layer} value={layer}>
                      <span className="flex items-center gap-2">
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {ANNOTATION_LAYER_CONFIGS[selectedLayer].description}
            </p>
          </div>

          <div>
            <Label htmlFor="timestamp" className="text-sm font-medium">
              Timestamp (optional)
            </Label>
            <input
              id="timestamp"
              type="text"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              placeholder="mm:ss or hh:mm:ss"
              className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: 05:23 or 1:05:23
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!content.trim()}>
          {parentId ? 'Post Reply' : 'Add Annotation'}
        </Button>
      </div>
    </form>
  );
}

// Utility functions
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseTimestamp(timestamp: string): number | undefined {
  const parts = timestamp.split(':').map(Number);
  if (parts.some(isNaN)) return undefined;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return undefined;
}
