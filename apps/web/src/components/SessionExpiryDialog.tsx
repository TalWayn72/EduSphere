import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SessionExpiryDialogProps {
  open: boolean;
  onReLogin: () => void;
}

/**
 * Modal shown when the user's JWT has expired. The backdrop is not dismissible
 * — the user must click "Log in again" to re-authenticate via Keycloak.
 */
export function SessionExpiryDialog({
  open,
  onReLogin,
}: SessionExpiryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => { /* prevent dismiss */ }}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Session expired</DialogTitle>
          <DialogDescription>
            Your session has expired due to inactivity. Please log in again to
            continue where you left off.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onReLogin}>Log in again</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
