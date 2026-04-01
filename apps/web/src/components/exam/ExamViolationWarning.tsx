/**
 * ExamViolationWarning — Modal shown when a browser security violation occurs.
 *
 * Shows violation type, count remaining, and final voided state.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ExamViolationWarningProps {
  open: boolean;
  violationType: string;
  violationCount: number;
  maxViolations: number;
  isVoided: boolean;
  onDismiss: () => void;
}

const VIOLATION_LABELS: Record<string, string> = {
  TAB_SWITCH: 'You navigated away from the exam tab.',
  FULLSCREEN_EXIT: 'Fullscreen mode was exited.',
  CLIPBOARD_ATTEMPT: 'A clipboard operation was attempted.',
  DEVTOOLS_DETECTED: 'Developer tools were detected.',
  RIGHT_CLICK: 'Right-click context menu was blocked.',
  KEYBOARD_SHORTCUT: 'A restricted keyboard shortcut was used.',
  SCREENSHOT_ATTEMPT: 'A screenshot attempt was detected.',
};

export function ExamViolationWarning({
  open,
  violationType,
  violationCount,
  maxViolations,
  isVoided,
  onDismiss,
}: ExamViolationWarningProps) {
  const description =
    VIOLATION_LABELS[violationType] ?? 'An integrity violation was detected.';

  return (
    <Dialog open={open} onOpenChange={() => !isVoided && onDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            {isVoided
              ? 'Exam Voided'
              : 'Warning: Exam Integrity Violation Detected'}
          </DialogTitle>
          <DialogDescription>
            {isVoided
              ? 'Your exam has been voided due to repeated integrity violations.'
              : description}
          </DialogDescription>
        </DialogHeader>

        {!isVoided && (
          <p className="text-sm text-muted-foreground">
            Warning {violationCount} of {maxViolations}
          </p>
        )}

        <DialogFooter>
          <Button
            variant={isVoided ? 'destructive' : 'default'}
            onClick={onDismiss}
          >
            {isVoided ? 'Return to Dashboard' : 'I understand'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
