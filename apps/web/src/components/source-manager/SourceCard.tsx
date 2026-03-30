/**
 * SourceCard — Individual source item in the SourceManager list.
 */
import { useTranslation } from 'react-i18next';
import type { KnowledgeSource } from './types';
import {
  SOURCE_ICONS,
  STATUS_COLORS,
  STATUS_I18N_KEYS,
} from './types';
import { getFriendlySourceErrorKey } from './utils';

interface SourceCardProps {
  source: KnowledgeSource;
  onSelect: (id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

export function SourceCard({ source, onSelect, onDelete }: SourceCardProps) {
  const { t } = useTranslation('content');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(source.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(source.id); } }}
      aria-label={`${source.title} - ${t(STATUS_I18N_KEYS[source.status])}`}
      className="flex items-start gap-3 p-3 rounded-xl bg-white border hover:border-blue-300 cursor-pointer transition-all group focus:outline-2 focus:outline-primary dark:bg-gray-900"
    >
      <span className="text-xl mt-0.5 shrink-0" aria-hidden="true">
        {SOURCE_ICONS[source.sourceType]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate dark:text-gray-100">
          {source.title}
        </p>
        {source.origin && (
          <p className="text-xs text-gray-400 truncate mt-0.5 dark:text-gray-500">
            {source.origin}
          </p>
        )}
        {source.preview && source.status === 'READY' && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed dark:text-gray-400">
            {source.preview}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-xs font-medium ${STATUS_COLORS[source.status]}`}>
            {t(STATUS_I18N_KEYS[source.status])}
          </span>
          {source.status === 'READY' && source.chunkCount > 0 && (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300"
              data-testid="embedding-badge-indexed"
            >
              &#x2713; {t('sources.indexed', 'Indexed')}
              <span className="text-green-500 dark:text-green-400">
                ({source.chunkCount})
              </span>
            </span>
          )}
          {source.status === 'READY' && source.chunkCount === 0 && (
            <span
              className="inline-flex items-center text-xs font-medium text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded-full dark:bg-yellow-900 dark:text-yellow-300"
              data-testid="embedding-badge-not-indexed"
            >
              {t('sources.notIndexed', 'Not indexed')}
            </span>
          )}
          {source.status === 'PROCESSING' && (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300"
              data-testid="embedding-badge-indexing"
            >
              <span className="h-3 w-3 border-2 border-blue-400 dark:border-blue-500 border-t-transparent rounded-full animate-spin" />
              {t('sources.indexing', 'Indexing...')}
            </span>
          )}
          {source.status === 'FAILED' && (
            <span className="text-xs text-red-400 truncate dark:text-red-400">
              &mdash;{' '}
              {t(getFriendlySourceErrorKey(source.errorMessage))}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={(e) => onDelete(e, source.id)}
        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all text-lg leading-none mt-0.5 shrink-0 dark:text-gray-600"
        aria-label={t('sources.deleteSourceLabel', { title: source.title, defaultValue: `Delete source: ${source.title}` })}
        title={t('sources.deleteTitle')}
      >
        <span aria-hidden="true">&#x2715;</span>
      </button>
    </div>
  );
}
