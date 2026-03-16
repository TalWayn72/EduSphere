/**
 * CourseSourcesPanel — collapsible knowledge sources panel.
 */
import { useState } from 'react';
import { BookMarked } from 'lucide-react';
import { SourceManager } from '@/components/SourceManager';

interface Props {
  courseId: string;
}

export function CourseSourcesPanel({ courseId }: Props) {
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
          מקורות מידע
        </span>
        <span className="text-muted-foreground">
          {showSources ? '▲' : '▼'}
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
