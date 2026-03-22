/**
 * SourceDetailDrawer — Full-content view for a single knowledge source.
 */

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { gqlClient as graphqlClient } from '@/lib/graphql';
import { KNOWLEDGE_SOURCE_DETAIL } from '@/lib/graphql/sources.queries';
import type { KnowledgeSource } from './types';
import { IS_DEV_MODE, authHeaders, hasValidAuth, getSourceErrorKey } from './utils';
import { getDevSources } from './dev-mock';

export function SourceDetailDrawer({
  sourceId,
  onClose,
}: {
  sourceId: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('content');
  const dir = i18n.dir();

  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['knowledge-source', sourceId],
    queryFn: IS_DEV_MODE
      ? () => {
          const devSources = getDevSources();
          return Promise.resolve(
            devSources.find((s) => s.id === sourceId) ?? devSources[0],
          );
        }
      : () => {
          if (!hasValidAuth()) {
            throw new Error('Not authenticated — please log in');
          }
          return graphqlClient
            .request(KNOWLEDGE_SOURCE_DETAIL, { id: sourceId }, authHeaders())
            .then(
              (r: { knowledgeSource: KnowledgeSource }) => r.knowledgeSource,
            );
        },
  });

  const formattedDate = data?.createdAt
    ? (() => {
        const d = new Date(data.createdAt);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString(i18n.language);
      })()
    : '';

  return (
    <div className="absolute inset-0 z-10 bg-white flex flex-col dark:bg-gray-900" dir={dir}>
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 dark:text-gray-500"
        >
          {t('sources.back')}
        </button>
        <span className="font-medium truncate">{data?.title ?? '...'}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-200">
        {isLoading
          ? t('sources.loading')
          : isError
            ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  {t(getSourceErrorKey(queryError))}
                </p>
              </div>
            )
            : (data?.rawContent ?? t('sources.noContent'))}
      </div>
      <div className="px-4 py-2 border-t text-xs text-gray-400 dark:text-slate-400">
        {data &&
          t('sources.chunkFooter', {
            count: data.chunkCount,
            date: formattedDate,
          })}
      </div>
    </div>
  );
}
