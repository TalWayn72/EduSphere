/**
 * GenerateTokenDialog — dialog for creating and displaying new SCIM tokens.
 */
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';

interface GenerateTokenDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  expiresInDays: string;
  onExpiresInDaysChange: (v: string) => void;
  generatedToken: string | null;
  onGenerate: () => void;
  onDone: () => void;
}

export function GenerateTokenDialog({
  open,
  onOpenChange,
  description,
  onDescriptionChange,
  expiresInDays,
  onExpiresInDaysChange,
  generatedToken,
  onGenerate,
  onDone,
}: GenerateTokenDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !generatedToken) onOpenChange(false);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate SCIM Token</DialogTitle>
          <DialogDescription className="sr-only">
            Create a new SCIM provisioning token for HRIS integration.
          </DialogDescription>
        </DialogHeader>
        {generatedToken ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm dark:bg-amber-950 dark:border-amber-700">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 dark:text-amber-400" />
              <span className="text-amber-800 dark:text-amber-200">
                Save this token - it will not be shown again.
              </span>
            </div>
            <div className="p-3 bg-muted rounded-md font-mono text-xs break-all select-all">
              {generatedToken}
            </div>
            <Button className="w-full" onClick={onDone}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="scim-token-description"
                className="text-sm font-medium block mb-1"
              >
                Description
              </label>
              <input
                id="scim-token-description"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="e.g. Workday Production"
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="scim-token-expires"
                className="text-sm font-medium block mb-1"
              >
                Expires in days (optional)
              </label>
              <input
                id="scim-token-expires"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                type="number"
                min="1"
                placeholder="e.g. 365"
                value={expiresInDays}
                onChange={(e) => onExpiresInDaysChange(e.target.value)}
              />
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!description.trim()}
                onClick={() => void onGenerate()}
              >
                Generate
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
