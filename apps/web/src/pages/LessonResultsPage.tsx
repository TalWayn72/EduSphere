import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { LESSON_QUERY, ADD_LESSON_ASSET_MUTATION } from '@/lib/graphql/lesson.queries';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PipelineResult {
  id: string;
  moduleName: string;
  outputType: string;
  outputData: Record<string, unknown> | null;
  fileUrl?: string | null;
}

interface LessonAsset {
  id: string;
  assetType: string;
  sourceUrl?: string | null;
  fileUrl?: string | null;
}

interface LessonQueryData {
  lesson: {
    id: string;
    title: string;
    status: string;
    assets: LessonAsset[];
    pipeline?: {
      id: string;
      currentRun?: {
        id: string;
        status: string;
        startedAt?: string | null;
        completedAt?: string | null;
        results: PipelineResult[];
      } | null;
    } | null;
  } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getResult(results: PipelineResult[], moduleName: string) {
  return results.find(
    (r) => r.moduleName === moduleName || r.moduleName === moduleName.toLowerCase()
  );
}

function getString(data: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!data) return null;
  const v = data[key];
  return v != null && v !== '' ? String(v) : null;
}

function getArray<T>(data: Record<string, unknown> | null | undefined, key: string): T[] | null {
  if (!data) return null;
  const v = data[key];
  return Array.isArray(v) && v.length > 0 ? (v as T[]) : null;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ResultCard({ icon, title, children, testId }: {
  icon: string; title: string; children: React.ReactNode; testId: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-4" data-testid={testId}>
      <h2 className="text-base font-semibold mb-3">{icon} {title}</h2>
      {children}
    </div>
  );
}

function ExpandableText({ text, limit = 600, testId }: { text: string; limit?: number; testId: string }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = text.length > limit && !expanded;
  return (
    <div>
      <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed text-foreground" data-testid={testId}>
        {truncated ? text.slice(0, limit) + '...' : text}
      </pre>
      {text.length > limit && (
        <button
          className="text-xs text-blue-600 hover:underline mt-1"
          onClick={() => setExpanded(!expanded)}
          data-testid={`${testId}-expand`}
        >
          {expanded ? 'הצג פחות' : `הצג עוד (${text.length} תווים)`}
        </button>
      )}
    </div>
  );
}

// ── Quick Video URL adder (empty state) ────────────────────────────────────────

function AddVideoPanel({ lessonId, courseId, lessonTitle }: {
  lessonId: string; courseId: string; lessonTitle: string;
}) {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [{ fetching }, addAsset] = useMutation(ADD_LESSON_ASSET_MUTATION);

  const handleAdd = async () => {
    if (!url.trim()) { setError('נא להזין קישור לסרטון'); return; }
    setError(null);
    const { error: addErr } = await addAsset({
      lessonId,
      input: { assetType: 'VIDEO', sourceUrl: url.trim() },
    });
    if (addErr) {
      const msg = addErr.graphQLErrors?.[0]?.message ?? addErr.message;
      console.error('[LessonResultsPage] addAsset failed:', msg, addErr);
      setError(msg);
      return;
    }
    navigate(`/courses/${courseId}/lessons/${lessonId}/pipeline`);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mt-4" data-testid="add-video-panel">
      <h3 className="font-semibold text-blue-800 mb-2">הוסף קישור לסרטון להרצת Pipeline</h3>
      <p className="text-sm text-blue-700 mb-3">
        הכנס קישור לסרטון (YouTube, Vimeo, URL ישיר) כדי להפעיל את ה-Pipeline ולקבל תמלול וסיכום.
      </p>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="flex-1 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          data-testid="video-url-input"
          aria-label={`קישור לסרטון עבור שיעור ${lessonTitle}`}
        />
        <Button size="sm" onClick={handleAdd} disabled={fetching} data-testid="add-video-btn">
          {fetching ? 'מוסיף...' : 'הוסף ופתח Pipeline'}
        </Button>
      </div>
      {error && (
        <p className="text-red-600 text-xs mt-2" data-testid="add-video-error" role="alert">{error}</p>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function LessonResultsPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();

  // Defer query until after mount to prevent React concurrent-mode setState-during-render
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [{ data, fetching, error }] = useQuery<LessonQueryData>({
    query: LESSON_QUERY,
    variables: { id: lessonId },
    pause: !mounted || !lessonId,
  });

  useEffect(() => {
    if (error) console.error('[LessonResultsPage] Query error:', error.message);
  }, [error]);

  if (!mounted || fetching) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  const lesson = data?.lesson;
  if (!lesson) {
    return (
      <Layout>
        <div className="p-6 text-muted-foreground">השיעור לא נמצא</div>
      </Layout>
    );
  }

  const results = lesson.pipeline?.currentRun?.results ?? [];
  const runStatus = lesson.pipeline?.currentRun?.status;
  const completedAt = lesson.pipeline?.currentRun?.completedAt;
  const hasResults = results.length > 0;

  // Extract each module's output
  const ingestion    = getResult(results, 'INGESTION');
  const asr          = getResult(results, 'ASR');
  const nerLinking   = getResult(results, 'NER_SOURCE_LINKING');
  const cleaning     = getResult(results, 'CONTENT_CLEANING');
  const summarize    = getResult(results, 'SUMMARIZATION');
  const structured   = getResult(results, 'STRUCTURED_NOTES');
  const diagram      = getResult(results, 'DIAGRAM_GENERATOR');
  const citations    = getResult(results, 'CITATION_VERIFIER');
  const qa           = getResult(results, 'QA_GATE');
  const publish      = getResult(results, 'PUBLISH_SHARE');

  // Transcript (ASR)
  const transcript = getString(asr?.outputData, 'transcript') ??
                     getString(asr?.outputData, 'text') ??
                     getString(asr?.outputData, 'transcription');
  const asrLanguage = getString(asr?.outputData, 'language');
  const asrDuration = asr?.outputData?.['duration'];

  // Ingestion
  const ingestedUrl = getString(ingestion?.outputData, 'sourceUrl') ??
                      getString(ingestion?.outputData, 'fileUrl') ??
                      lesson.assets?.[0]?.sourceUrl ??
                      lesson.assets?.[0]?.fileUrl;

  // NER / Source linking
  const entities = getArray<{ text: string; type: string }>(nerLinking?.outputData, 'entities');
  const linkedSources = getArray<{ title: string; url?: string }>(nerLinking?.outputData, 'linkedSources');

  // Content cleaning
  const cleanedText = getString(cleaning?.outputData, 'cleanedText');

  // Summarization
  const shortSummary = getString(summarize?.outputData, 'shortSummary');
  const keyPoints = getArray<string>(summarize?.outputData, 'keyPoints');

  // Structured notes
  const notesMarkdown = getString(structured?.outputData, 'outputMarkdown');

  // Diagram
  const mermaidSrc = getString(diagram?.outputData, 'mermaidSrc');

  // Citation verifier
  const verifiedCount = (citations?.outputData?.['verifiedCitations'] as unknown[] | undefined)?.length ?? 0;
  const failedCount   = (citations?.outputData?.['failedCitations'] as unknown[] | undefined)?.length ?? 0;
  const matchReport   = getString(citations?.outputData, 'matchReport');

  // QA Gate
  const qaScore = qa?.outputData?.['overallScore'] ?? qa?.outputData?.['qaScore'];
  const fixList = getArray<{ description: string; severity: string }>(qa?.outputData, 'fixList');

  // Publish
  const publishedUrl   = getString(publish?.outputData, 'publishedUrl');
  const publishReady   = publish?.outputData?.['publishReady'];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/courses/${courseId}/lessons/${lessonId}`)}
          >
            {lesson.title} ←
          </Button>
          <h1 className="text-2xl font-bold">תוצאות Pipeline</h1>
        </div>

        {/* Run status badge */}
        {runStatus && (
          <div className="flex items-center gap-2 mb-4 text-sm" data-testid="run-status-badge">
            {runStatus === 'COMPLETED' && <span className="text-green-600 font-medium">✅ הושלם</span>}
            {runStatus === 'RUNNING'   && <span className="text-blue-600 font-medium">⏳ מריץ...</span>}
            {runStatus === 'FAILED'    && <span className="text-red-600 font-medium">❌ נכשל</span>}
            {runStatus === 'CANCELLED' && <span className="text-muted-foreground font-medium">⛔ בוטל</span>}
            {completedAt && (
              <span className="text-muted-foreground text-xs">
                {new Date(completedAt).toLocaleString('he-IL')}
              </span>
            )}
            <button
              className="ml-auto text-xs text-blue-600 hover:underline"
              onClick={() => navigate(`/courses/${courseId}/lessons/${lessonId}/pipeline`)}
              data-testid="open-pipeline-btn"
            >
              פתח Pipeline Builder
            </button>
          </div>
        )}

        {/* Empty state */}
        {!hasResults && (
          <div>
            <div className="text-center py-10 text-muted-foreground" data-testid="empty-results">
              <p className="text-4xl mb-3">⏳</p>
              <p className="text-base">אין תוצאות עדיין. הפעל את ה-Pipeline תחילה.</p>
              <Button
                className="mt-4"
                onClick={() => navigate(`/courses/${courseId}/lessons/${lessonId}/pipeline`)}
                data-testid="open-pipeline-from-empty"
              >
                פתח Pipeline Builder
              </Button>
            </div>
            {lessonId && courseId && (
              <AddVideoPanel
                lessonId={lessonId}
                courseId={courseId}
                lessonTitle={lesson.title}
              />
            )}
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div className="space-y-4">
            {/* Ingestion — what was processed */}
            {ingestion && (
              <ResultCard icon="📥" title="חומר גלם שעובד" testId="result-ingestion">
                {ingestedUrl ? (
                  <p className="text-sm text-blue-700 break-all" data-testid="ingestion-url">
                    <a href={ingestedUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      {ingestedUrl}
                    </a>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">קובץ הועלה מקומית</p>
                )}
                {getString(ingestion.outputData, 'assetType') && (
                  <span className="text-xs text-muted-foreground mt-1 block">
                    סוג: {getString(ingestion.outputData, 'assetType')}
                  </span>
                )}
              </ResultCard>
            )}

            {/* ASR — Transcription */}
            {asr && (
              <ResultCard icon="🎙" title="תמלול (ASR)" testId="result-asr">
                <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
                  {asrLanguage && (
                    <span data-testid="asr-language">שפה: {asrLanguage}</span>
                  )}
                  {asrDuration != null && (
                    <span data-testid="asr-duration">
                      אורך: {Math.round(Number(asrDuration) / 60)} דק'
                    </span>
                  )}
                </div>
                {transcript ? (
                  <ExpandableText text={transcript} limit={800} testId="asr-transcript" />
                ) : (
                  <p className="text-sm text-muted-foreground">התמלול בעיבוד...</p>
                )}
              </ResultCard>
            )}

            {/* Content Cleaning */}
            {cleaning && cleanedText && (
              <ResultCard icon="🧹" title="טקסט מנוקה" testId="result-cleaning">
                <ExpandableText text={cleanedText} limit={600} testId="cleaned-text" />
              </ResultCard>
            )}

            {/* NER / Source Linking */}
            {nerLinking && (entities || linkedSources) && (
              <ResultCard icon="🔗" title="זיהוי מקורות וישויות" testId="result-ner">
                {entities && (
                  <div className="mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground mb-1 uppercase">ישויות שזוהו</h3>
                    <div className="flex flex-wrap gap-1">
                      {entities.slice(0, 20).map((e, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200" data-testid={`entity-${i}`}>
                          {e.text}
                          {e.type && <span className="text-muted-foreground ml-1">({e.type})</span>}
                        </span>
                      ))}
                      {entities.length > 20 && (
                        <span className="text-xs text-muted-foreground">+{entities.length - 20} נוספות</span>
                      )}
                    </div>
                  </div>
                )}
                {linkedSources && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground mb-1 uppercase">מקורות מקושרים</h3>
                    <ul className="text-sm space-y-1">
                      {linkedSources.slice(0, 10).map((s, i) => (
                        <li key={i}>
                          {s.url ? (
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{s.title}</a>
                          ) : (
                            <span>{s.title}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </ResultCard>
            )}

            {/* Summarization */}
            {summarize && (shortSummary || keyPoints) && (
              <ResultCard icon="📋" title="סיכום" testId="result-summarization">
                {shortSummary && (
                  <div className="mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground mb-1 uppercase">סיכום קצר</h3>
                    <p className="text-sm leading-relaxed" data-testid="summary-short">{shortSummary}</p>
                  </div>
                )}
                {keyPoints && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground mb-1 uppercase">נקודות מפתח</h3>
                    <ul className="list-disc list-inside text-sm space-y-1" data-testid="summary-keypoints">
                      {keyPoints.slice(0, 8).map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}
              </ResultCard>
            )}

            {/* Structured Notes */}
            {structured && notesMarkdown && (
              <ResultCard icon="📝" title="תיעוד מובנה" testId="result-structured-notes">
                <ExpandableText text={notesMarkdown} limit={2000} testId="notes-markdown" />
              </ResultCard>
            )}

            {/* Diagram */}
            {diagram && mermaidSrc && (
              <ResultCard icon="📊" title="תרשים מושגים" testId="result-diagram">
                <pre className="text-xs bg-muted rounded p-3 overflow-auto" data-testid="diagram-mermaid">{mermaidSrc}</pre>
              </ResultCard>
            )}

            {/* Citation Verifier */}
            {citations && (
              <ResultCard icon="🔍" title="אימות ציטוטים" testId="result-citations">
                <div className="flex gap-4 mb-3">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm" data-testid="citations-verified">
                    ✓ אומתו: {verifiedCount}
                  </span>
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm" data-testid="citations-failed">
                    ✗ נכשלו: {failedCount}
                  </span>
                </div>
                {matchReport && (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap" data-testid="citations-report">
                    {matchReport.slice(0, 800)}
                  </pre>
                )}
              </ResultCard>
            )}

            {/* QA Gate */}
            {qa && (
              <ResultCard icon="✅" title="בקרת איכות" testId="result-qa">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl font-bold text-blue-600" data-testid="qa-score">
                    {Math.round(Number(qaScore ?? 0) * (Number(qaScore ?? 0) <= 1 ? 100 : 1))}%
                  </div>
                  <span className="text-sm text-muted-foreground">ציון כללי</span>
                </div>
                {fixList && fixList.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">תיקונים מומלצים:</h3>
                    <ul className="text-xs space-y-1" data-testid="qa-fix-list">
                      {fixList.slice(0, 5).map((fix, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className={fix.severity === 'HIGH' ? 'text-red-500' : fix.severity === 'MEDIUM' ? 'text-yellow-500' : 'text-muted-foreground'}>●</span>
                          <span>{fix.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </ResultCard>
            )}

            {/* Publish & Share */}
            {publish && (
              <ResultCard icon="🚀" title="יצוא והפצה" testId="result-publish">
                {publishReady === true && (
                  <p className="text-green-600 text-sm font-medium mb-2" data-testid="publish-ready">✅ מוכן לפרסום</p>
                )}
                {publishedUrl && (
                  <a
                    href={publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-sm break-all"
                    data-testid="publish-url"
                  >
                    {publishedUrl}
                  </a>
                )}
              </ResultCard>
            )}

            {/* Link to pipeline */}
            <div className="text-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/courses/${courseId}/lessons/${lessonId}/pipeline`)}
                data-testid="run-pipeline-again-btn"
              >
                ▶ הרץ Pipeline מחדש
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
