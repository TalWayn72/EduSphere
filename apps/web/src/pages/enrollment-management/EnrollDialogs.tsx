import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ADMIN_ENROLL_USER_MUTATION,
  ADMIN_BULK_ENROLL_MUTATION,
} from '@/lib/graphql/content-tier3.queries';

// ── Enroll User Dialog ──────────────────────────────────────────────────────

interface EnrollUserDialogProps {
  open: boolean;
  courseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EnrollUserDialog({
  open,
  courseId,
  onClose,
  onSuccess,
}: EnrollUserDialogProps) {
  const { t } = useTranslation('admin');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [, enrollUser] = useMutation(ADMIN_ENROLL_USER_MUTATION);

  const handleEnroll = async () => {
    if (!userId.trim()) {
      setError(t('enrollment.userIdRequired'));
      return;
    }
    const result = await enrollUser({ courseId, userId: userId.trim() });
    if (result.error) {
      console.error('[EnrollmentManagement] Enroll failed:', result.error.message);
      setError(t('enrollment.enrollFailed'));
    } else {
      setUserId('');
      setError('');
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('enrollment.enrollUserTitle')}</DialogTitle>
          <DialogDescription className="sr-only">Enroll a user in the selected course.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder={t('enrollment.userIdPlaceholder')}
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setError(''); }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('enrollment.cancel')}</Button>
          <Button onClick={handleEnroll}>{t('enrollment.enroll')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Enroll Dialog ──────────────────────────────────────────────────────

interface BulkEnrollDialogProps {
  open: boolean;
  courseId: string;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export function BulkEnrollDialog({
  open,
  courseId,
  onClose,
  onSuccess,
}: BulkEnrollDialogProps) {
  const { t } = useTranslation('admin');
  const [rawInput, setRawInput] = useState('');
  const [error, setError] = useState('');
  const [, bulkEnroll] = useMutation(ADMIN_BULK_ENROLL_MUTATION);

  const handleBulkEnroll = async () => {
    const userIds = rawInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (userIds.length === 0) {
      setError(t('enrollment.bulkEnrollMin'));
      return;
    }
    const result = await bulkEnroll({ courseId, userIds });
    if (result.error) {
      console.error('[EnrollmentManagement] Bulk enroll failed:', result.error.message);
      setError(t('enrollment.bulkEnrollFailed'));
    } else {
      const count = (result.data as { adminBulkEnroll: number })?.adminBulkEnroll ?? 0;
      setRawInput('');
      setError('');
      onSuccess(count);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('enrollment.bulkEnrollTitle')}</DialogTitle>
          <DialogDescription className="sr-only">Bulk enroll multiple users via CSV input.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">{t('enrollment.bulkEnrollDesc')}</p>
          <textarea
            className="w-full h-32 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={t('enrollment.bulkEnrollPlaceholder')}
            value={rawInput}
            onChange={(e) => { setRawInput(e.target.value); setError(''); }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('enrollment.cancel')}</Button>
          <Button onClick={handleBulkEnroll}>{t('enrollment.enrollAll')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
