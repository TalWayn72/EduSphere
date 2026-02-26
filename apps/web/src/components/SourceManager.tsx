/**
 * SourceManager — NotebookLM-style information sources panel.
 *
 * Allows users to attach information sources to a course:
 *   • URL scraping (web pages, articles)
 *   • Raw text paste
 *   • Local file upload (DOCX / PDF) — dispatched via backend mutation
 *
 * Design: left sidebar panel with a source list + "Add source" button.
 */

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { gqlClient as graphqlClient } from '@/lib/graphql';
import {
  COURSE_KNOWLEDGE_SOURCES,
  KNOWLEDGE_SOURCE_DETAIL,
  ADD_URL_SOURCE,
  ADD_TEXT_SOURCE,
  DELETE_KNOWLEDGE_SOURCE,
} from '@/lib/graphql/sources.queries';

// ─── Types ───────────────────────────────────────────────────────────────────

type SourceStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
type SourceType =
  | 'FILE_DOCX'
  | 'FILE_PDF'
  | 'FILE_TXT'
  | 'URL'
  | 'YOUTUBE'
  | 'TEXT';

interface KnowledgeSource {
  id: string;
  title: string;
  sourceType: SourceType;
  origin?: string;
  preview?: string;
  rawContent?: string;
  status: SourceStatus;
  chunkCount: number;
  errorMessage?: string;
  createdAt: string;
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────

const SOURCE_ICONS: Record<SourceType, string> = {
  FILE_DOCX: '📄',
  FILE_PDF: '📕',
  FILE_TXT: '📝',
  URL: '🌐',
  YOUTUBE: '▶️',
  TEXT: '✏️',
};

const STATUS_COLORS: Record<SourceStatus, string> = {
  PENDING: 'text-yellow-500',
  PROCESSING: 'text-blue-500 animate-pulse',
  READY: 'text-green-600',
  FAILED: 'text-red-500',
};

const STATUS_LABELS: Record<SourceStatus, string> = {
  PENDING: 'ממתין...',
  PROCESSING: 'מעבד...',
  READY: 'מוכן',
  FAILED: 'שגיאה',
};

// ─── Add-source Modal ─────────────────────────────────────────────────────────

type AddTab = 'url' | 'text' | 'file';

function AddSourceModal({
  courseId,
  onClose,
  onAdded,
}: {
  courseId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [tab, setTab] = useState<AddTab>('url');
  const [url, setUrl] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [text, setText] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [fileTitle, setFileTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const addUrl = useMutation({
    mutationFn: (input: { courseId: string; title: string; url: string }) =>
      graphqlClient.request(ADD_URL_SOURCE, { input }),
    onSuccess: () => {
      onAdded();
      onClose();
    },
    onError: (e) => setError(String(e)),
  });

  const addText = useMutation({
    mutationFn: (input: { courseId: string; title: string; text: string }) =>
      graphqlClient.request(ADD_TEXT_SOURCE, { input }),
    onSuccess: () => {
      onAdded();
      onClose();
    },
    onError: (e) => setError(String(e)),
  });

  const handleSubmit = async () => {
    setError('');
    setBusy(true);
    try {
      if (tab === 'url') {
        if (!url) return setError('נא להזין URL');
        const title = urlTitle || new URL(url).hostname;
        await addUrl.mutateAsync({ courseId, title, url });
      } else if (tab === 'text') {
        if (!text.trim()) return setError('נא להזין טקסט');
        const title = textTitle || text.slice(0, 50) + '...';
        await addText.mutateAsync({ courseId, title, text });
      } else if (tab === 'file') {
        const file = fileRef.current?.files?.[0];
        if (!file) return setError('נא לבחור קובץ');
        // File upload: POST to REST endpoint which wraps the GraphQL mutation
        const fd = new FormData();
        fd.append('file', file);
        fd.append('courseId', courseId);
        fd.append('title', fileTitle || file.name);
        const res = await fetch('/api/knowledge-sources/upload', {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) throw new Error(await res.text());
        onAdded();
        onClose();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="w-[520px] rounded-2xl bg-white shadow-2xl flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">הוספת מקור מידע</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          {(['url', 'text', 'file'] as AddTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'url' ? '🌐 קישור' : t === 'text' ? '✏️ טקסט' : '📄 קובץ'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          {tab === 'url' && (
            <>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                dir="ltr"
              />
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="כותרת (אופציונלי)"
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                המערכת תאסוף את תוכן העמוד, תחלק לחלקים ותצור embeddings.
              </p>
            </>
          )}

          {tab === 'text' && (
            <>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="כותרת למקור"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
              />
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm h-40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="הדבק כאן טקסט חופשי — מאמר, קטע ספר, הערות..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </>
          )}

          {tab === 'file' && (
            <>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="כותרת (אופציונלי)"
                value={fileTitle}
                onChange={(e) => setFileTitle(e.target.value)}
              />
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 transition-colors">
                <span className="text-3xl mb-1">📂</span>
                <span className="text-sm text-gray-600">
                  גרור קובץ לכאן או לחץ לבחירה
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  DOCX, PDF, TXT
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".docx,.pdf,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && !fileTitle) setFileTitle(f.name);
                  }}
                />
              </label>
            </>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'מעבד...' : 'הוספת מקור'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Source detail drawer ─────────────────────────────────────────────────────

function SourceDetailDrawer({
  sourceId,
  onClose,
}: {
  sourceId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-source', sourceId],
    queryFn: () =>
      graphqlClient
        .request(KNOWLEDGE_SOURCE_DETAIL, { id: sourceId })
        .then((r: { knowledgeSource: KnowledgeSource }) => r.knowledgeSource),
  });

  return (
    <div className="absolute inset-0 z-10 bg-white flex flex-col" dir="rtl">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
          ← חזרה
        </button>
        <span className="font-medium truncate">{data?.title ?? '...'}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
        {isLoading ? 'טוען...' : (data?.rawContent ?? 'אין תוכן זמין.')}
      </div>
      <div className="px-4 py-2 border-t text-xs text-gray-400">
        {data &&
          `${data.chunkCount} קטעים • נוצר ${new Date(data.createdAt).toLocaleDateString('he-IL')}`}
      </div>
    </div>
  );
}

// ─── Main SourceManager Panel ─────────────────────────────────────────────────

export function SourceManager({ courseId }: { courseId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['course-sources', courseId],
    queryFn: () =>
      graphqlClient
        .request(COURSE_KNOWLEDGE_SOURCES, { courseId })
        .then(
          (r: { courseKnowledgeSources: KnowledgeSource[] }) =>
            r.courseKnowledgeSources
        ),
    refetchInterval: (query) => {
      const sources = query.state.data as KnowledgeSource[] | undefined;
      const hasProcessing = sources?.some(
        (s) => s.status === 'PENDING' || s.status === 'PROCESSING'
      );
      return hasProcessing ? 3000 : false;
    },
  });

  const deleteSource = useMutation({
    mutationFn: (id: string) =>
      graphqlClient.request(DELETE_KNOWLEDGE_SOURCE, { id }),
    onSuccess: () => refetch(),
  });

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm('להסיר מקור זה?')) deleteSource.mutate(id);
    },
    [deleteSource]
  );

  return (
    <div
      className="relative flex flex-col h-full bg-gray-50 border-r"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div>
          <h3 className="font-semibold text-sm text-gray-800">מקורות מידע</h3>
          <p className="text-xs text-gray-500">
            {data ? `${data.length} מקורות` : '...'}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <span className="text-base leading-none">+</span>
          הוסף מקור
        </button>
      </div>

      {/* Source list */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {isLoading && (
          <div className="text-center text-sm text-gray-400 mt-8">
            טוען מקורות...
          </div>
        )}

        {!isLoading && data?.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <span className="text-5xl mb-3">📚</span>
            <p className="text-sm font-medium text-gray-700">
              אין מקורות עדיין
            </p>
            <p className="text-xs text-gray-500 mt-1">
              הוסף קישורים, מסמכים או טקסט — המערכת תנתח ותאנדקס אותם
            </p>
          </div>
        )}

        {data?.map((source: KnowledgeSource) => (
          <div
            key={source.id}
            onClick={() => setDetailId(source.id)}
            className="flex items-start gap-3 p-3 rounded-xl bg-white border hover:border-blue-300 cursor-pointer transition-all group"
          >
            <span className="text-xl mt-0.5 shrink-0">
              {SOURCE_ICONS[source.sourceType]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {source.title}
              </p>
              {source.origin && (
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {source.origin}
                </p>
              )}
              {source.preview && source.status === 'READY' && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                  {source.preview}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className={`text-xs font-medium ${STATUS_COLORS[source.status]}`}
                >
                  {STATUS_LABELS[source.status]}
                </span>
                {source.status === 'READY' && (
                  <span className="text-xs text-gray-400">
                    · {source.chunkCount} קטעים
                  </span>
                )}
                {source.status === 'FAILED' && source.errorMessage && (
                  <span className="text-xs text-red-400 truncate">
                    — {source.errorMessage}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => handleDelete(e, source.id)}
              className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-lg leading-none mt-0.5 shrink-0"
              title="הסר מקור"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Info footer */}
      <div className="px-4 py-3 border-t bg-white">
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          המערכת מנתחת את המקורות ומאנדקסת אותם לחיפוש סמנטי ו-AI
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
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
