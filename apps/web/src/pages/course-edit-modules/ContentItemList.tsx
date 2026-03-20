/**
 * Renders a sorted list of content items within a module.
 */
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { ContentItemSummary } from './types';
import { typeBadgeVariant, TYPE_EMOJI } from './utils';

interface ContentItemListProps {
  items: ContentItemSummary[];
}

export function ContentItemList({ items }: ContentItemListProps) {
  const { t } = useTranslation('courses');

  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground pl-2">
        {t('noContentItems')}
      </p>
    );
  }

  return (
    <ul className="space-y-1.5 pl-2">
      {[...items]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm">
            <span>{TYPE_EMOJI[item.contentType] ?? '\u{1F4C4}'}</span>
            <span className="flex-1 truncate">{item.title}</span>
            <Badge
              variant={typeBadgeVariant(item.contentType)}
              className="text-xs"
            >
              {item.contentType}
            </Badge>
          </li>
        ))}
    </ul>
  );
}
