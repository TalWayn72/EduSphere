import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TranscriptSegment } from '@/lib/mock-content-data';

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  currentTime: number;
  onSeek: (timestamp: number) => void;
}

export function TranscriptPanel({ segments, currentTime, onSeek }: TranscriptPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredSegments = segments.filter((segment) =>
    segment.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isSegmentActive = (segment: TranscriptSegment) => {
    return currentTime >= segment.startTime && currentTime < segment.endTime;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredSegments.map((segment) => {
          const isActive = isSegmentActive(segment);
          return (
            <div
              key={segment.id}
              onClick={() => onSeek(segment.startTime)}
              className={cn(
                'p-3 rounded-lg cursor-pointer transition-colors border',
                isActive
                  ? 'bg-primary/10 border-primary'
                  : 'hover:bg-muted border-transparent'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span
                  className={cn(
                    'text-xs font-mono',
                    isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
                  )}
                >
                  {formatTime(segment.startTime)}
                </span>
              </div>
              <p
                className={cn(
                  'text-sm leading-relaxed',
                  isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {segment.text}
              </p>
            </div>
          );
        })}

        {filteredSegments.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No matching segments found</p>
          </div>
        )}
      </div>
    </div>
  );
}
