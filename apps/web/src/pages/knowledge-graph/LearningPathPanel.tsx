import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GitBranch, Loader2, ChevronRight } from 'lucide-react';
import { DEV_MODE } from '@/lib/auth';
import type { ApiLearningPath } from './types';

interface LearningPathPanelProps {
  pathFrom: string;
  setPathFrom: (v: string) => void;
  pathTo: string;
  setPathTo: (v: string) => void;
  pathSearchTrigger: { from: string; to: string } | null;
  pathError: string | null;
  learningPath: ApiLearningPath | null;
  learningPathError: boolean;
  isPathLoading: boolean;
  mockPathLoading: boolean;
  onFindPath: () => void;
  onSelectNode: (id: string) => void;
}

export const LearningPathPanel = React.memo(function LearningPathPanel({
  pathFrom,
  setPathFrom,
  pathTo,
  setPathTo,
  pathSearchTrigger,
  pathError,
  learningPath,
  learningPathError,
  isPathLoading,
  mockPathLoading,
  onFindPath,
  onSelectNode,
}: LearningPathPanelProps) {
  const { t } = useTranslation('knowledge');

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          {t('learningPath')}
        </p>
        <div className="flex gap-1">
          <input
            value={pathFrom}
            onChange={(e) => setPathFrom(e.target.value)}
            placeholder={t('fromConcept')}
            className="flex-1 min-w-0 px-2 py-1 text-xs border rounded-md bg-background"
            onKeyDown={(e) => e.key === 'Enter' && onFindPath()}
          />
          <span className="text-muted-foreground self-center text-xs">
            {'\u2192'}
          </span>
          <input
            value={pathTo}
            onChange={(e) => setPathTo(e.target.value)}
            placeholder={t('toConcept')}
            className="flex-1 min-w-0 px-2 py-1 text-xs border rounded-md bg-background"
            onKeyDown={(e) => e.key === 'Enter' && onFindPath()}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full h-7 text-xs"
          onClick={onFindPath}
          disabled={isPathLoading}
        >
          {isPathLoading ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              {t('finding')}
            </>
          ) : (
            t('findPath')
          )}
        </Button>

        {pathError && <p className="text-xs text-destructive">{pathError}</p>}

        {!DEV_MODE && learningPathError && (
          <p
            role="alert"
            data-testid="path-error-banner"
            className="text-xs text-destructive"
          >
            {t('pathError')}
          </p>
        )}

        {pathSearchTrigger &&
          !mockPathLoading &&
          !isPathLoading &&
          !learningPathError &&
          (learningPath ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {learningPath.steps} step
                {learningPath.steps !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap items-center gap-1">
                {learningPath.concepts.map((c, i) => (
                  <span key={c.id} className="flex items-center gap-1">
                    <button
                      onClick={() => onSelectNode(c.id)}
                      className="text-xs px-1.5 py-0.5 rounded border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-950 font-medium hover:bg-yellow-100 transition-colors dark:border-yellow-500"
                    >
                      {c.name}
                    </button>
                    {i < learningPath.concepts.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              {t('noPath')}
            </p>
          ))}
      </CardContent>
    </Card>
  );
});
