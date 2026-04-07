/**
 * EditSourceModal — Dialog to edit a knowledge source's title and metadata.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { KnowledgeSource } from './types';
import { useUpdateSourceMutation } from './useUpdateSourceMutation';

interface EditSourceModalProps {
  source: KnowledgeSource;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditSourceModal({
  source,
  onClose,
  onUpdated,
}: EditSourceModalProps) {
  const { t, i18n } = useTranslation('content');
  const dir = i18n.dir();
  const [title, setTitle] = useState(source.title);
  const [metadataStr, setMetadataStr] = useState(
    source.metadata ? JSON.stringify(source.metadata, null, 2) : ''
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpdated = () => {
    setSuccess(true);
    onUpdated();
    setTimeout(onClose, 1200);
  };

  const updateSource = useUpdateSourceMutation({
    onUpdated: handleUpdated,
    setError,
    t,
  });

  const handleSave = async () => {
    setError('');
    if (!title.trim()) {
      setError(t('sources.titleRequired', 'Title is required'));
      return;
    }

    let metadata: Record<string, unknown> | undefined;
    if (metadataStr.trim()) {
      try {
        metadata = JSON.parse(metadataStr) as Record<string, unknown>;
      } catch {
        setError(
          t('sources.metadataInvalidJson', 'Metadata must be valid JSON')
        );
        return;
      }
    }

    await updateSource.mutateAsync({
      id: source.id,
      title: title.trim(),
      metadata,
    });
  };

  const busy = updateSource.isPending;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="w-[480px] max-w-[90vw] p-0 gap-0"
        dir={dir}
        data-testid="edit-source-modal"
      >
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            {t('sources.editSourceTitle', 'Edit Source')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t(
              'sources.editSourceDescription',
              'Update the source title or metadata'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 flex flex-col gap-4">
          {success && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2 dark:bg-green-950 dark:text-green-300">
              <span>&#x2705;</span>
              <span className="text-sm">
                {t('sources.updatedSuccess', 'Source updated')}
              </span>
            </div>
          )}

          {!success && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-200">
                  {t('sources.titleLabel', 'Title')}
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={busy}
                  data-testid="edit-source-title-input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-200">
                  {t('sources.metadataLabel', 'Metadata (JSON, optional)')}
                </label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono h-28 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={metadataStr}
                  onChange={(e) => setMetadataStr(e.target.value)}
                  disabled={busy}
                  placeholder="{}"
                  data-testid="edit-source-metadata-input"
                />
              </div>

              {error && (
                <p
                  className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 dark:text-red-400 dark:bg-red-950"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {!success && (
          <div className="flex gap-3 justify-end px-6 py-4 border-t">
            <button
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 dark:text-gray-300"
            >
              {t('sources.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={busy}
              className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white dark:text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500"
              data-testid="edit-source-save-btn"
            >
              {busy && (
                <span className="w-3.5 h-3.5 border-2 border-white dark:border-white border-t-transparent rounded-full animate-spin" />
              )}
              {busy
                ? t('sources.saving', 'Saving...')
                : t('sources.save', 'Save')}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
