/**
 * TimestampAnchorEditor — set start/end time for visual anchor blocks.
 *
 * Displays a list of blocks with VISUAL_ANCHOR type, allowing the instructor
 * to set or adjust start/end timestamps by typing or using "Set to current time".
 */
import { useState, useCallback } from 'react';
import { Clock, MapPin, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EnrichedTranscriptBlock } from '@/components/enriched-transcript/enriched-transcript.types';

interface TimestampAnchorEditorProps {
  blocks: EnrichedTranscriptBlock[];
  currentTime: number;
  onSave: (blockId: string, startTime: number, endTime: number | null) => void;
  className?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseTime(str: string): number | null {
  const parts = str.split(':').map(Number);
  const [minutes, seconds] = parts;
  if (parts.length === 2 && parts.every((n) => !isNaN(n)) && minutes !== undefined && seconds !== undefined) {
    return minutes * 60 + seconds;
  }
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

interface BlockEditorRowProps {
  block: EnrichedTranscriptBlock;
  currentTime: number;
  onSave: (blockId: string, start: number, end: number | null) => void;
}

function BlockEditorRow({ block, currentTime, onSave }: BlockEditorRowProps) {
  const [start, setStart] = useState(
    block.startTime != null ? formatTime(block.startTime) : '',
  );
  const [end, setEnd] = useState(
    block.endTime != null ? formatTime(block.endTime) : '',
  );

  const handleSave = useCallback(() => {
    const s = parseTime(start);
    if (s === null) return;
    const e = end ? parseTime(end) : null;
    onSave(block.id, s, e);
  }, [block.id, start, end, onSave]);

  const setStartToCurrent = () => setStart(formatTime(currentTime));
  const setEndToCurrent = () => setEnd(formatTime(currentTime));

  return (
    <div
      className="border rounded-md p-2 space-y-2"
      data-testid={`anchor-editor-${block.id}`}
    >
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm truncate flex-1">
          {block.anchor?.anchorText ?? `Block #${block.blockOrder}`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Start</label>
          <div className="flex gap-1">
            <Input
              value={start}
              onChange={(e) => setStart(e.target.value)}
              placeholder="0:00"
              className="h-7 text-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs shrink-0"
              onClick={setStartToCurrent}
              title="Set to current time"
            >
              <Clock className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">End</label>
          <div className="flex gap-1">
            <Input
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              placeholder="0:00"
              className="h-7 text-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs shrink-0"
              onClick={setEndToCurrent}
              title="Set to current time"
            >
              <Clock className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 mt-4 shrink-0"
          onClick={handleSave}
          disabled={!start}
        >
          <Save className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function TimestampAnchorEditor({
  blocks,
  currentTime,
  onSave,
  className = '',
}: TimestampAnchorEditorProps) {
  const anchorBlocks = blocks.filter((b) => b.blockType === 'VISUAL_ANCHOR');

  return (
    <div className={`flex flex-col h-full ${className}`} data-testid="timestamp-anchor-editor">
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Timestamp Anchors</span>
        <span className="text-xs text-muted-foreground ms-auto">
          Now: {formatTime(currentTime)}
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {anchorBlocks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No visual anchor blocks to configure.
            </p>
          )}
          {anchorBlocks.map((block) => (
            <BlockEditorRow
              key={block.id}
              block={block}
              currentTime={currentTime}
              onSave={onSave}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
