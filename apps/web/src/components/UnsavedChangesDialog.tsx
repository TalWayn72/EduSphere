/**
 * UnsavedChangesDialog — modal shown when the user tries to navigate away
 * while a page has unsaved changes.
 *
 * Rendered by pages that use useUnsavedChangesGuard:
 *   const blocker = useUnsavedChangesGuard(isDirty, 'MyPage');
 *   <UnsavedChangesDialog
 *     open={blocker.state === 'blocked'}
 *     onLeave={() => blocker.proceed?.()}
 *     onStay={() => blocker.reset?.()}
 *   />
 */
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onLeave: () => void;
  onStay: () => void;
}

export function UnsavedChangesDialog({ open, onLeave, onStay }: Props) {
  const { t } = useTranslation('common');

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
      data-testid="unsaved-changes-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
        <h2
          id="unsaved-changes-title"
          className="text-lg font-semibold"
          data-testid="unsaved-changes-title"
        >
          {t('unsavedChanges.title')}
        </h2>
        <p className="text-sm text-muted-foreground" data-testid="unsaved-changes-message">
          {t('unsavedChanges.message')}
        </p>
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onStay}
            data-testid="unsaved-stay-btn"
          >
            {t('unsavedChanges.stay')}
          </Button>
          <Button
            variant="destructive"
            onClick={onLeave}
            data-testid="unsaved-leave-btn"
          >
            {t('unsavedChanges.leave')}
          </Button>
        </div>
      </div>
    </div>
  );
}
