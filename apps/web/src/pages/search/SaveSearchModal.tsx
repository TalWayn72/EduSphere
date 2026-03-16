import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';

interface SaveSearchModalProps {
  name: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}

export function SaveSearchModal({
  name,
  onNameChange,
  onSave,
  onClose,
  saving,
}: SaveSearchModalProps) {
  const { t } = useTranslation('common');

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      data-testid="save-search-modal"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t('saveSearch', 'Save Search')}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <input
          className="w-full border rounded-md px-3 py-2 text-sm"
          placeholder={t('savedSearchNamePlaceholder', 'Name this search...')}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
          data-testid="save-search-name-input"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving || !name.trim()}
            data-testid="save-search-confirm-btn"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {t('save', 'Save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
