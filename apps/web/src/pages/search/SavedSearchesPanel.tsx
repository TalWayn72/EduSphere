import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { X, Trash2 } from 'lucide-react';
import type { SavedSearch } from './search.types';

interface SavedSearchesPanelProps {
  savedSearches: SavedSearch[];
  onLoad: (saved: SavedSearch) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function SavedSearchesPanel({
  savedSearches,
  onLoad,
  onDelete,
  onClose,
}: SavedSearchesPanelProps) {
  const { t } = useTranslation('common');

  return (
    <div
      className="fixed right-0 top-0 h-full w-72 bg-background border-l shadow-xl z-40 flex flex-col"
      data-testid="saved-searches-panel"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">
          {t('savedSearches', 'Saved Searches')}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {savedSearches.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('noSavedSearches', 'No saved searches yet')}
          </p>
        ) : (
          savedSearches.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
              data-testid="saved-search-item"
            >
              <button
                className="flex-1 text-left text-sm truncate"
                onClick={() => onLoad(s)}
              >
                {s.name}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => void onDelete(s.id)}
                data-testid="delete-saved-search-btn"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
