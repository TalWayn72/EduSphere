/**
 * BiExportTokenModal — Generate/display API token modal for BI Export settings.
 */
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface BiExportTokenModalProps {
  description: string;
  generatedToken: string | null;
  onDescriptionChange: (value: string) => void;
  onGenerate: () => void;
  onClose: () => void;
}

export function BiExportTokenModal({
  description,
  generatedToken,
  onDescriptionChange,
  onGenerate,
  onClose,
}: BiExportTokenModalProps) {
  const { t } = useTranslation('admin');

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={() => {
        if (!generatedToken) onClose();
      }}
    >
      <div
        className="bg-background rounded-lg p-6 max-w-md w-full mx-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">
          {t('biExport.generateModalTitle')}
        </h2>
        {generatedToken ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm dark:bg-amber-950 dark:border-amber-700">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 dark:text-amber-400" />
              <span className="text-amber-800 dark:text-amber-200">
                {t('biExport.tokenWarning')}
              </span>
            </div>
            <div className="p-3 bg-muted rounded-md font-mono text-xs break-all select-all">
              {generatedToken}
            </div>
            <Button className="w-full" onClick={onClose}>
              {t('biExport.done')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1">
                {t('biExport.description')}
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder={t('biExport.descriptionPlaceholder')}
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                {t('biExport.cancel')}
              </Button>
              <Button
                className="flex-1"
                disabled={!description.trim()}
                onClick={onGenerate}
              >
                {t('biExport.generate')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
