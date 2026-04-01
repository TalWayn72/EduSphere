/**
 * UnsavedChangesDialog — modal shown when the user tries to navigate away
 * while a page has unsaved changes.
 *
 * BUG-098: Converted from raw <div role="dialog"> to Radix Dialog for proper
 * a11y (DialogTitle + DialogDescription + focus trapping + Escape handling).
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onLeave: () => void;
  onStay: () => void;
}

export function UnsavedChangesDialog({ open, onLeave, onStay }: Props) {
  const { t } = useTranslation('common');

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onStay();
      }}
    >
      <DialogContent data-testid="unsaved-changes-dialog" className="max-w-sm">
        <DialogHeader>
          <DialogTitle data-testid="unsaved-changes-title">
            {t('unsavedChanges.title')}
          </DialogTitle>
          <DialogDescription data-testid="unsaved-changes-message">
            {t('unsavedChanges.message')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-3 justify-end">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
