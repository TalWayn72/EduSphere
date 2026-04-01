/**
 * EmbeddingReindexDialog — Confirmation dialog before reindexing embeddings.
 * Shows source/course counts and handles loading state.
 */
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface EmbeddingReindexDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  totalSources: number;
  courseCount: number;
}

export function EmbeddingReindexDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  totalSources,
  courseCount,
}: EmbeddingReindexDialogProps) {
  const { t } = useTranslation('admin');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="reindex-confirm-dialog">
        <DialogHeader>
          <DialogTitle>
            {t('embeddings.reindexDialogTitle', 'Confirm Reindex')}
          </DialogTitle>
          <DialogDescription id="reindex-dialog-description">
            {t(
              'embeddings.reindexDialogDescription',
              'This will regenerate embeddings for {{sources}} sources in {{courses}} courses. Continue?',
              { sources: totalSources, courses: courseCount }
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            data-testid="reindex-cancel-btn"
          >
            {t('embeddings.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            data-testid="reindex-confirm-btn"
            aria-describedby="reindex-dialog-description"
          >
            {loading ? (
              <>
                <Loader2
                  className="h-4 w-4 mr-1 animate-spin"
                  aria-hidden="true"
                />
                {t('embeddings.reindexing', 'Reindexing...')}
              </>
            ) : (
              t('embeddings.confirmReindex', 'Yes, Reindex')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
