import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { urqlClient } from '@/lib/urql-client';
import { UPDATE_MEDIA_ALT_TEXT_MUTATION } from '@/lib/graphql/content-tier3.queries';

interface Props {
  mediaId: string;
  initialAltText: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: (altText: string) => void;
}

const MAX_ALT_TEXT_LENGTH = 125;

export function AltTextModal({ mediaId, initialAltText, open, onClose, onSaved }: Props) {
  const { t } = useTranslation('media');
  const [value, setValue] = useState(initialAltText ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initialAltText ?? '');
      setError(null);
    }
  }, [open, initialAltText]);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(t('altText.required', 'Alt-text is required'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await urqlClient
        .mutation(UPDATE_MEDIA_ALT_TEXT_MUTATION, { mediaId, altText: trimmed })
        .toPromise();
      if (result.error) {
        setError(result.error.message);
        return;
      }
      onSaved(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save alt-text');
    } finally {
      setSaving(false);
    }
  };

  const remaining = MAX_ALT_TEXT_LENGTH - value.length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            {t('altText.title', 'Review AI-Generated Alt-Text')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            {t('altText.description', 'AI has generated a description for this image. Review and edit it to ensure accuracy and accessibility.')}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="alt-text-input">
              {t('altText.label', 'Alt-text')}
            </Label>
            <Textarea
              id="alt-text-input"
              value={value}
              onChange={(e) => setValue(e.target.value.slice(0, MAX_ALT_TEXT_LENGTH))}
              placeholder={t('altText.placeholder', 'Describe the image...')}
              rows={3}
              disabled={saving}
              className="resize-none"
              aria-describedby="alt-text-counter"
            />
            <p
              id="alt-text-counter"
              className={'text-xs text-right ' + (remaining < 10 ? 'text-destructive' : 'text-muted-foreground')}
            >
              {remaining} {t('altText.remaining', 'characters remaining')}
            </p>
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('altText.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving || !value.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('altText.save', 'Save Alt-Text')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
