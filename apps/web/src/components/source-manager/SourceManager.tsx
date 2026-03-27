/**
 * SourceManager — NotebookLM-style information sources panel.
 *
 * Allows users to attach information sources to a course:
 *   - URL scraping (web pages, articles)
 *   - Raw text paste
 *   - Local file upload (DOCX / PDF) -- dispatched via backend mutation
 *
 * Design: left sidebar panel with a source list + "Add source" button.
 *
 * DEV_MODE: when VITE_DEV_MODE=true, mock data is returned without hitting
 * the GraphQL backend. This keeps E2E and Storybook tests self-contained.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { gqlClient as graphqlClient } from '@/lib/graphql';
import {
  COURSE_KNOWLEDGE_SOURCES,
  DELETE_KNOWLEDGE_SOURCE,
} from '@/lib/graphql/sources.queries';
import type { KnowledgeSource } from './types';
import {
  SOURCE_ICONS,
  STATUS_COLORS,
  STATUS_I18N_KEYS,
} from './types';
import {
  IS_DEV_MODE,
  authHeaders,
  hasValidAuth,
  getSourceErrorKey,
  getFriendlySourceErrorKey,
} from './utils';
import { devQueryFn, devRemoveSource } from './dev-mock';
import { AddSourceModal } from './AddSourceModal';
import { SourceDetailDrawer } from './SourceDetailDrawer';

function requireAuth(): void {
  if (!hasValidAuth()) {
    throw new Error('Not authenticated — please log in');
  }
}

export function SourceManager({ courseId }: { courseId: string }) {
  const { t, i18n } = useTranslation('content');
  const dir = i18n.dir();
  const [showAdd, setShowAdd] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addedBanner, setAddedBanner] = useState<string | null>(null);
  const addedBannerTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Cleanup banner timer on unmount
  useEffect(() => {
    return () => {
      if (addedBannerTimerRef.current)
        clearTimeout(addedBannerTimerRef.current);
    };
  }, []);

  const { data, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ['course-sources', courseId],
    queryFn: IS_DEV_MODE
      ? devQueryFn
      : () => {
          requireAuth();
          return graphqlClient
            .request(COURSE_KNOWLEDGE_SOURCES, { courseId }, authHeaders())
            .then(
              (r: { courseKnowledgeSources: KnowledgeSource[] }) =>
                r.courseKnowledgeSources,
            );
        },
    refetchInterval: IS_DEV_MODE
      ? false
      : (query) => {
          const sources = query.state.data as KnowledgeSource[] | undefined;
          const hasProcessing = sources?.some(
            (s) => s.status === 'PENDING' || s.status === 'PROCESSING',
          );
          return hasProcessing ? 3000 : false;
        },
    retry: 2,
  });

  const deleteSource = useMutation({
    mutationFn: IS_DEV_MODE
      ? (id: string) => {
          devRemoveSource(id);
          return Promise.resolve();
        }
      : (id: string) => {
          requireAuth();
          return graphqlClient.request(DELETE_KNOWLEDGE_SOURCE, { id }, authHeaders());
        },
    onSuccess: () => refetch(),
    onError: (e: unknown) => {
      window.alert(t(getSourceErrorKey(e)));
    },
  });

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm(t('sources.deleteConfirm'))) deleteSource.mutate(id);
    },
    [deleteSource, t],
  );

  return (
    <div
      className="relative flex flex-col h-full bg-gray-50 border-r dark:bg-gray-800"
      dir={dir}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white dark:bg-gray-900">
        <div>
          <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100" data-testid="sources-title">
            {t('sources.title')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {data
              ? t('sources.count', { count: data.length })
              : isError
                ? t('sources.errorGeneric')
                : t('sources.loading')}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors dark:bg-blue-500 dark:text-white"
          data-testid="add-source-btn"
          aria-label={t('sources.addSource')}
        >
          <span className="text-base leading-none" aria-hidden="true">+</span>
          {t('sources.addSource')}
        </button>
      </div>

      {/* Added-source banner */}
      {addedBanner && (
        <div className="mx-2 mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-sm text-green-700 animate-in slide-in-from-top-2 dark:bg-green-950 dark:border-green-700 dark:text-green-300">
          <span>&#x2705;</span>
          <span>{addedBanner}</span>
        </div>
      )}

      {/* Source list */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1" role="list" aria-label={t('sources.title')}>
        {isLoading && (
          <div className="text-center text-sm text-gray-400 mt-8 dark:text-gray-500">
            {t('sources.loadingSources')}
          </div>
        )}

        {!isLoading && isError && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <span className="text-4xl mb-3">&#x26A0;&#xFE0F;</span>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {t(getSourceErrorKey(queryError))}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors dark:bg-blue-500 dark:text-white"
            >
              {t('sources.retry', '\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1')}
            </button>
          </div>
        )}

        {!isLoading && !isError && data?.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <span className="text-5xl mb-3">&#x1F4DA;</span>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('sources.noSourcesYet')}
            </p>
            <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
              {t('sources.noSourcesHint')}
            </p>
          </div>
        )}

        {data?.map((source: KnowledgeSource) => (
          <div
            key={source.id}
            role="button"
            tabIndex={0}
            onClick={() => setDetailId(source.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailId(source.id); } }}
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
                <span
                  className={`text-xs font-medium ${STATUS_COLORS[source.status]}`}
                >
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
              onClick={(e) => handleDelete(e, source.id)}
              className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all text-lg leading-none mt-0.5 shrink-0 dark:text-gray-600"
              aria-label={t('sources.deleteSourceLabel', { title: source.title, defaultValue: `Delete source: ${source.title}` })}
              title={t('sources.deleteTitle')}
            >
              <span aria-hidden="true">&#x2715;</span>
            </button>
          </div>
        ))}
      </div>

      {/* Info footer */}
      <div className="px-4 py-3 border-t bg-white dark:bg-gray-900">
        <p className="text-xs text-gray-400 text-center leading-relaxed dark:text-gray-500">
          {t('sources.footerInfo')}
        </p>
      </div>

      {/* Detail drawer */}
      {detailId && (
        <SourceDetailDrawer
          sourceId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}

      {/* Add modal */}
      {showAdd && (
        <AddSourceModal
          courseId={courseId}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            refetch();
            setAddedBanner(t('sources.addedBanner'));
            if (addedBannerTimerRef.current)
              clearTimeout(addedBannerTimerRef.current);
            addedBannerTimerRef.current = setTimeout(
              () => setAddedBanner(null),
              5000,
            );
          }}
        />
      )}
    </div>
  );
}
