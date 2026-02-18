import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, User, Users, BookOpen, Bot, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Annotation } from '@/lib/mock-content-data';

interface AnnotationsPanelProps {
  annotations: Annotation[];
  currentTime: number;
  onSeek: (timestamp: number) => void;
  onAddAnnotation: () => void;
}

const LAYER_CONFIG = {
  PERSONAL: {
    label: 'Personal',
    icon: User,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  SHARED: {
    label: 'Shared',
    icon: Users,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950',
  },
  INSTRUCTOR: {
    label: 'Instructor',
    icon: BookOpen,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
  },
  AI_GENERATED: {
    label: 'AI Generated',
    icon: Bot,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
  },
} as const;

export function AnnotationsPanel({
  annotations,
  currentTime,
  onSeek,
  onAddAnnotation,
}: AnnotationsPanelProps) {
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(
    new Set(['SHARED', 'INSTRUCTOR'])
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRelativeTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const toggleLayer = (layer: string) => {
    const newLayers = new Set(visibleLayers);
    if (newLayers.has(layer)) {
      newLayers.delete(layer);
    } else {
      newLayers.add(layer);
    }
    setVisibleLayers(newLayers);
  };

  const filteredAnnotations = annotations
    .filter((annotation) => visibleLayers.has(annotation.layer))
    .sort((a, b) => a.timestamp - b.timestamp);

  const isAnnotationNearCurrent = (timestamp: number) => {
    return Math.abs(currentTime - timestamp) < 5;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <h3 className="font-semibold text-sm">Annotation Layers</h3>
        <div className="space-y-2">
          {Object.entries(LAYER_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const count = annotations.filter((a) => a.layer === key).length;
            return (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={`layer-${key}`}
                  checked={visibleLayers.has(key)}
                  onCheckedChange={() => toggleLayer(key)}
                />
                <label
                  htmlFor={`layer-${key}`}
                  className="flex items-center gap-2 flex-1 text-sm cursor-pointer"
                >
                  <Icon className={cn('h-4 w-4', config.color)} />
                  <span>{config.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">({count})</span>
                </label>
              </div>
            );
          })}
        </div>

        <Button onClick={onAddAnnotation} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredAnnotations.map((annotation) => {
          const config = LAYER_CONFIG[annotation.layer];
          const Icon = config.icon;
          const isNearCurrent = isAnnotationNearCurrent(annotation.timestamp);

          return (
            <Card
              key={annotation.id}
              onClick={() => onSeek(annotation.timestamp)}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                config.bgColor,
                isNearCurrent && 'ring-2 ring-primary'
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2 mb-2">
                  <Icon className={cn('h-4 w-4 mt-0.5', config.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold truncate">
                        {annotation.author}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(annotation.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-mono text-muted-foreground">
                        {formatTime(annotation.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">
                      {annotation.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredAnnotations.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No annotations for selected layers
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
