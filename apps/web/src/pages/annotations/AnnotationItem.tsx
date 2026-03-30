/**
 * AnnotationItem — annotation card with hover delete button.
 */
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { AnnotationCard } from '@/pages/AnnotationCard';
import type { Annotation } from '@/types/annotations';

interface AnnotationItemProps {
  ann: Annotation;
  onSeek: (contentId: string, ts?: number) => void;
  onDeleteRequest: (id: string) => void;
}

export function AnnotationItem({ ann, onSeek, onDeleteRequest }: AnnotationItemProps) {
  const { t } = useTranslation('annotations');
  return (
    <div className="relative group">
      <AnnotationCard ann={ann} onSeek={onSeek} />
      <button
        onClick={() => onDeleteRequest(ann.id)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        aria-label={t('deleteAriaLabel')}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
