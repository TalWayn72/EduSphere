import React from 'react';
import { BookOpen, Clock, Layers, Globe, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CourseFormData } from './course-create.types';

interface Props {
  data: CourseFormData;
  onPublish: (publish: boolean) => void;
  isSubmitting: boolean;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export function CourseWizardStep3({ data, onPublish, isSubmitting }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Review your course before publishing. You can always edit it later.
      </p>

      {/* Course preview card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <span className="text-5xl">{data.thumbnail}</span>
          <div className="flex-1 space-y-1">
            <h3 className="text-xl font-semibold">{data.title || '(No title)'}</h3>
            {data.description && (
              <p className="text-sm text-muted-foreground">{data.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2 border-t text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="h-4 w-4 shrink-0" />
            <span>{DIFFICULTY_LABELS[data.difficulty]}</span>
          </div>
          {data.duration && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{data.duration}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="h-4 w-4 shrink-0" />
            <span>{data.modules.length} module{data.modules.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </Card>

      {/* Modules list */}
      {data.modules.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Modules ({data.modules.length})</p>
          <div className="space-y-1">
            {data.modules.map((mod, i) => (
              <div key={mod.id} className="flex items-center gap-2 text-sm py-1.5 border-b last:border-0">
                <span className="text-muted-foreground font-mono w-6 text-right shrink-0">
                  {i + 1}.
                </span>
                <span className="font-medium">{mod.title}</span>
                {mod.description && (
                  <span className="text-muted-foreground text-xs truncate">
                    — {mod.description}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publish actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          className="flex-1 gap-2"
          onClick={() => onPublish(true)}
          disabled={!data.title || isSubmitting}
        >
          <Globe className="h-4 w-4" />
          Publish Course
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => onPublish(false)}
          disabled={!data.title || isSubmitting}
        >
          <EyeOff className="h-4 w-4" />
          Save as Draft
        </Button>
      </div>

      {!data.title && (
        <p className="text-xs text-destructive text-center">
          Please go back and add a course title before publishing.
        </p>
      )}
    </div>
  );
}
