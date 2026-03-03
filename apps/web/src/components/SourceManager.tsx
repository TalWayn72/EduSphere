/**
 * SourceManager — NotebookLM-style information sources panel.
 *
 * Allows users to attach information sources to a course:
 *   • URL scraping (web pages, articles)
 *   • Raw text paste
 *   • Local file upload (DOCX / PDF) — dispatched via backend mutation
 *
 * Design: left sidebar panel with a source list + "Add source" button.
 *
 * DEV_MODE: when VITE_DEV_MODE=true, mock data is returned without hitting
 * the GraphQL backend. This keeps E2E and Storybook tests self-contained.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { gqlClient as graphqlClient } from '@/lib/graphql';
import { getToken } from '@/lib/auth';
import {
  COURSE_KNOWLEDGE_SOURCES,
  KNOWLEDGE_SOURCE_DETAIL,
  ADD_URL_SOURCE,
  ADD_TEXT_SOURCE,
  ADD_YOUTUBE_SOURCE,
  ADD_FILE_SOURCE,
  DELETE_KNOWLEDGE_SOURCE,
} from '@/lib/graphql/sources.queries';

// ─── DEV_MODE flag ────────────────────────────────────────────────────────────

/** Returns Authorization header for authenticated gqlClient requests. */
function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const IS_DEV_MODE =
  import.meta.env.VITE_DEV_MODE === 'true' ||
  !import.meta.env.VITE_KEYCLOAK_URL;

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

// ─── DEV_MODE mock data ───────────────────────────────────────────────────────

/**
 * Mutable in-memory store for DEV_MODE sources.
 * Persists within the session so add/delete operations are reflected immediately.
 */
let _devSources: KnowledgeSource[] = [
  {
    id: 'dev-src-1',
    title: 'מבוא לתלמוד',
    sourceType: 'URL',
    origin: 'https://example.com/intro-talmud',
    preview: 'מסכת בבא קמא — פרק ראשון: מניין הנזיקין.',
    rawContent:
      'מסכת בבא קמא — פרק ראשון: מניין הנזיקין.\n\n' +
      'ארבעה אבות נזיקין: השור, והבור, והמבעה, וההבער.\n' +
      'לא הרי השור כהרי המבעה, ולא הרי המבעה כהרי השור.\n' +
      'לא זה וזה שיש בהן רוח חיים כהרי האש שאין בו רוח חיים.\n' +
      'ולא זה וזה שדרכן לילך ולהזיק כהרי הבור שאין דרכו לילך ולהזיק.\n' +
      'הצד השוה שבכולן — שדרכן להזיק ושמירתן עליך.',
    status: 'READY',
    chunkCount: 12,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'dev-src-2',
    title: 'הרמב"ם - משנה תורה',
    sourceType: 'TEXT',
    preview: 'הלכות תשובה — פרק א.',
    rawContent:
      'הלכות תשובה — פרק א.\n\n' +
      'כל המצוות שבתורה, בין עשה בין לא תעשה — אם עבר אדם על אחת מהן, בין בזדון בין בשגגה, ' +
      'כשיעשה תשובה וישוב מחטאו, חייב להתוודות לפני האל ברוך הוא, שנאמר "איש או אשה כי יעשו" ' +
      'וגו׳ "והתוודו את חטאתם אשר עשו".\n\n' +
      'זה וידוי דברים. ווידוי זה מצות עשה.',
    status: 'READY',
    chunkCount: 7,
    createdAt: new Date(Date.now() - 43200000).toISOString(),
  },
];

/** Mock query function for DEV_MODE — returns a snapshot of the mutable store. */
function devQueryFn(): Promise<KnowledgeSource[]> {
  return Promise.resolve([..._devSources]);
}

/** Creates a new mock source and appends it to the dev store. */
function devAddSource(
  sourceType: SourceType,
  title: string,
  origin?: string
): KnowledgeSource {
  const mockContent =
    `(תוכן לדוגמה — סביבת פיתוח)\n\n` +
    `המסמך "${origin ?? title}" הועלה בהצלחה.\n` +
    `בסביבת ייצור, כאן יוצג התוכן המלא שחולץ מהמסמך לאחר עיבוד אוטומטי.\n\n` +
    `לורם איפסום דולור סיט אמט, קונסקטורר אדיפיסינג אלית. ` +
    `סמי שמי ח עס הedio לי זה להאמין. נולום ארווס מאסט ד'לורד.`;
  const src: KnowledgeSource = {
    id: `dev-src-${Date.now()}`,
    title,
    sourceType,
    origin,
    preview: mockContent.slice(0, 120),
    rawContent: mockContent,
    status: 'READY',
    chunkCount: Math.floor(Math.random() * 15) + 1,
    createdAt: new Date().toISOString(),
  };
  _devSources = [..._devSources, src];
  return src;
}

/** Removes a source from the dev store by id. */
function devRemoveSource(id: string): void {
  _devSources = _devSources.filter((s) => s.id !== id);
}

// ─── Error parser (exported for unit testing) ─────────────────────────────────

/** Extracts a user-friendly Hebrew message from a GraphQL or network error. */
export function parseSourceError(e: unknown): string {
  if (!e) return 'שגיאה לא ידועה';
  const msg = String(e);
  if (msg.includes('Unauthorized') || msg.includes('Auth required')) {
    return 'שגיאת הרשאה — נא להתחבר מחדש ולנסות שוב. אם הבעיה נמשכת, פנה למנהל המערכת.';
  }
  if (msg.includes('DOWNSTREAM_SERVICE_ERROR')) {
    return 'שגיאה בשירות הפנימי — ייתכן שהשרת אינו זמין. נסה שוב בעוד מספר שניות.';
  }
  if (msg.includes('Network') || msg.includes('fetch')) {
    return 'שגיאת רשת — בדוק שהשרת פועל ונסה שוב.';
  }
  return IS_DEV_MODE ? msg : 'שגיאה בהוספת המקור. נסה שוב.';
}

// ─── Add-source Modal ─────────────────────────────────────────────────────────

type AddTab = 'url' | 'text' | 'file' | 'youtube';

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
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Close modal on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !success) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, success]);

  // Auto-close 1.5 s after success is shown
  useEffect(() => {
    if (success) {
      closeTimerRef.current = setTimeout(onClose, 1500);
    }
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [success, onClose]);

  const addUrl = useMutation({
    mutationFn: IS_DEV_MODE
      ? (input: { courseId: string; title: string; url: string }) =>
          Promise.resolve(devAddSource('URL', input.title, input.url))
      : (input: { courseId: string; title: string; url: string }) =>
          graphqlClient.request(ADD_URL_SOURCE, { input }, authHeaders()),
    onSuccess: () => {
      onAdded();
      setSuccess(true);
    },
    onError: (e) => setError(parseSourceError(e)),
  });

  const addText = useMutation({
    mutationFn: IS_DEV_MODE
      ? (input: { courseId: string; title: string; text: string }) =>
          Promise.resolve(devAddSource('TEXT', input.title))
      : (input: { courseId: string; title: string; text: string }) =>
          graphqlClient.request(ADD_TEXT_SOURCE, { input }, authHeaders()),
    onSuccess: () => {
      onAdded();
      setSuccess(true);
    },
    onError: (e) => setError(parseSourceError(e)),
  });

  const addYoutube = useMutation({
    mutationFn: IS_DEV_MODE
      ? (input: { courseId: string; title: string; url: string }) =>
          Promise.resolve(devAddSource('YOUTUBE', input.title, input.url))
      : (input: { courseId: string; title: string; url: string }) =>
          graphqlClient.request(ADD_YOUTUBE_SOURCE, { input }, authHeaders()),
    onSuccess: () => {
      onAdded();
      setSuccess(true);
    },
    onError: (e) => setError(parseSourceError(e)),
  });

  const addFile = useMutation({
    mutationFn: IS_DEV_MODE
      ? (input: {
          courseId: string;
          title: string;
          fileName: string;
          contentBase64: string;
          mimeType: string;
        }) => {
          const lower = input.fileName.toLowerCase();
          const devType: SourceType = lower.endsWith('.docx')
            ? 'FILE_DOCX'
            : lower.endsWith('.txt')
              ? 'FILE_TXT'
              : 'FILE_PDF';
          return Promise.resolve(
            devAddSource(devType, input.title, input.fileName)
          );
        }
      : (input: {
          courseId: string;
          title: string;
          fileName: string;
          contentBase64: string;
          mimeType: string;
        }) => graphqlClient.request(ADD_FILE_SOURCE, { input }, authHeaders()),
    onSuccess: () => {
      onAdded();
      setSuccess(true);
    },
    onError: (e) => setError(parseSourceError(e)),
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
      } else if (tab === 'youtube') {
        if (!youtubeUrl.trim()) return setError('נא להזין קישור YouTube');
        const title = youtubeTitle || youtubeUrl;
        await addYoutube.mutateAsync({ courseId, title, url: youtubeUrl });
      } else if (tab === 'file') {
        const file = fileRef.current?.files?.[0];
        if (!file) return setError('נא לבחור קובץ');
        const contentBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl.split(',')[1] ?? '');
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        await addFile.mutateAsync({
          courseId,
          title: fileTitle || file.name,
          fileName: file.name,
          contentBase64,
          mimeType: file.type || 'application/octet-stream',
        });
      }
    } catch (e) {
      setError(parseSourceError(e));
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

        {/* Tabs — hidden when success */}
        {!success && (
          <div className="flex border-b px-6">
            {(['url', 'text', 'youtube', 'file'] as AddTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {t === 'url'
                  ? '🌐 קישור'
                  : t === 'text'
                    ? '✏️ טקסט'
                    : t === 'youtube'
                      ? '▶️ YouTube'
                      : '📄 קובץ'}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          {/* ── Success state ── */}
          {success && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">✅</span>
              </div>
              <p className="font-semibold text-green-700 text-base">
                המקור הוסף בהצלחה!
              </p>
              <p className="text-sm text-gray-500">
                מעובד ויוצג ברשימה בקרוב...
              </p>
            </div>
          )}

          {!success && tab === 'url' && (
            <>
              <label className="text-xs font-medium text-gray-700">
                כתובת URL
              </label>
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

          {!success && tab === 'text' && (
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

          {!success && tab === 'youtube' && (
            <>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                dir="ltr"
              />
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="כותרת (אופציונלי)"
                value={youtubeTitle}
                onChange={(e) => setYoutubeTitle(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                המערכת תוריד את תמלול הווידאו ותיצור ממנו embeddings לחיפוש
                סמנטי.
              </p>
            </>
          )}

          {!success && tab === 'file' && (
            <>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="כותרת (אופציונלי)"
                value={fileTitle}
                onChange={(e) => setFileTitle(e.target.value)}
                disabled={busy}
              />

              {/* Upload zone — spinner while busy, file picker otherwise */}
              {busy ? (
                <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <span className="text-sm text-blue-700 font-medium">
                    מעלה ומעבד קובץ…
                  </span>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 transition-colors">
                  <span className="text-3xl mb-1">
                    {selectedFileName ? '📄' : '📂'}
                  </span>
                  <span className="text-sm text-gray-600">
                    {selectedFileName || 'גרור קובץ לכאן או לחץ לבחירה'}
                  </span>
                  {!selectedFileName && (
                    <span className="text-xs text-gray-400 mt-1">
                      DOCX, PDF, TXT
                    </span>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".docx,.pdf,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setSelectedFileName(f.name);
                        if (!fileTitle) setFileTitle(f.name);
                      }
                    }}
                  />
                </label>
              )}
            </>
          )}

          {!success && error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer — hidden when success */}
        {!success && (
          <div className="flex gap-3 justify-end px-6 py-4 border-t">
            <button
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40"
            >
              ביטול
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {busy ? 'שולח...' : 'הוספת מקור'}
            </button>
          </div>
        )}
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
    queryFn: IS_DEV_MODE
      ? () =>
          Promise.resolve(
            _devSources.find((s) => s.id === sourceId) ?? _devSources[0]
          )
      : () =>
          graphqlClient
            .request(KNOWLEDGE_SOURCE_DETAIL, { id: sourceId }, authHeaders())
            .then(
              (r: { knowledgeSource: KnowledgeSource }) => r.knowledgeSource
            ),
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
  const [addedBanner, setAddedBanner] = useState<string | null>(null);
  const addedBannerTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Cleanup banner timer on unmount
  useEffect(() => {
    return () => {
      if (addedBannerTimerRef.current)
        clearTimeout(addedBannerTimerRef.current);
    };
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['course-sources', courseId],
    queryFn: IS_DEV_MODE
      ? devQueryFn
      : () =>
          graphqlClient
            .request(COURSE_KNOWLEDGE_SOURCES, { courseId }, authHeaders())
            .then(
              (r: { courseKnowledgeSources: KnowledgeSource[] }) =>
                r.courseKnowledgeSources
            ),
    refetchInterval: IS_DEV_MODE
      ? false
      : (query) => {
          const sources = query.state.data as KnowledgeSource[] | undefined;
          const hasProcessing = sources?.some(
            (s) => s.status === 'PENDING' || s.status === 'PROCESSING'
          );
          return hasProcessing ? 3000 : false;
        },
  });

  const deleteSource = useMutation({
    mutationFn: IS_DEV_MODE
      ? (id: string) => {
          devRemoveSource(id);
          return Promise.resolve();
        }
      : (id: string) =>
          graphqlClient.request(DELETE_KNOWLEDGE_SOURCE, { id }, authHeaders()),
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

      {/* Added-source banner */}
      {addedBanner && (
        <div className="mx-2 mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-sm text-green-700 animate-in slide-in-from-top-2">
          <span>✅</span>
          <span>{addedBanner}</span>
        </div>
      )}

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
            setAddedBanner('המקור נוסף ומעובד כעת — יוצג כאן בקרוב');
            if (addedBannerTimerRef.current)
              clearTimeout(addedBannerTimerRef.current);
            addedBannerTimerRef.current = setTimeout(
              () => setAddedBanner(null),
              5000
            );
          }}
        />
      )}
    </div>
  );
}
