import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Clock, Layers, Globe, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CourseFormData } from './course-create.types';

interface Props {
  data: CourseFormData;
  onPublish: (publish: boolean) => void;
  isSubmitting: boolean;
}

export function CourseWizardStep3({ data, onPublish, isSubmitting }: Props) {
  const { t } = useTranslation('courses');

  const DIFFICULTY_LABELS: Record<string, string> = {
    BEGINNER: t('difficulty.BEGINNER'),
    INTERMEDIATE: t('difficulty.INTERMEDIATE'),
    ADVANCED: t('difficulty.ADVANCED'),
  };
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t('wizard.reviewText')}
      </p>

      {/* Course preview card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <span className="text-5xl">{data.thumbnail}</span>
          <div className="flex-1 space-y-1">
            <h3 className="text-xl font-semibold">{data.title || t('wizard.noTitle')}</h3>
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
            <span>{t('wizard.moduleCount', { count: data.modules.length })}</span>
          </div>
        </div>
      </Card>

      {/* Modules list */}
      {data.modules.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('modules')} ({data.modules.length})</p>
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
          {t('wizard.publishCourse')}
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => onPublish(false)}
          disabled={!data.title || isSubmitting}
        >
          <EyeOff className="h-4 w-4" />
          {t('wizard.saveAsDraft')}
        </Button>
      </div>

      {!data.title && (
        <p className="text-xs text-destructive text-center">
          {t('wizard.pleaseAddTitle')}
        </p>
      )}
    </div>
  );
}
