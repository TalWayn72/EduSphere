/**
 * CourseSourcesPanel — collapsible knowledge sources panel.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookMarked } from 'lucide-react';
import { SourceManager } from '@/components/SourceManager';

interface Props {
  courseId: string;
}

export function CourseSourcesPanel({ courseId }: Props) {
  const { t } = useTranslation('courses');
  const [showSources, setShowSources] = useState(false);

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted transition-colors text-sm font-medium"
        onClick={() => setShowSources((v) => !v)}
        aria-expanded={showSources}
        data-testid="toggle-sources"
      >
        <span className="flex items-center gap-2">
          <BookMarked className="h-4 w-4 text-blue-600" />
          {t('knowledgeSources')}
        </span>
        <span className="text-muted-foreground">
          {showSources ? '\u25B2' : '\u25BC'}
        </span>
      </button>
      {showSources && (
        <div className="h-96" data-testid="sources-panel">
          <SourceManager courseId={courseId} />
        </div>
      )}
    </div>
  );
}
