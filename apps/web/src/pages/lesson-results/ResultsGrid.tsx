import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ResultCard, ExpandableText } from './ResultCard';
import { getString } from './types';
import type { extractResults } from './useLessonResults';

type ExtractedResults = ReturnType<typeof extractResults>;

interface ResultsGridProps {
  courseId: string;
  lessonId: string;
  r: ExtractedResults;
}

export function ResultsGrid({ courseId, lessonId, r }: ResultsGridProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Ingestion */}
      {r.ingestion && (
        <ResultCard icon="📥" title="חומר גלם שעובד" testId="result-ingestion">
          {r.ingestedUrl ? (
            <p className="text-sm text-blue-700 break-all dark:text-blue-300" data-testid="ingestion-url">
              <a href={r.ingestedUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {r.ingestedUrl}
              </a>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">קובץ הועלה מקומית</p>
          )}
          {getString(r.ingestion.outputData, 'assetType') && (
            <span className="text-xs text-muted-foreground mt-1 block">
              סוג: {getString(r.ingestion.outputData, 'assetType')}
            </span>
          )}
        </ResultCard>
      )}

      {/* ASR — Transcription */}
      {r.asr && (
        <ResultCard icon="🎙" title="תמלול (ASR)" testId="result-asr">
          <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
            {r.asrLanguage && (
              <span data-testid="asr-language">שפה: {r.asrLanguage}</span>
            )}
            {r.asrDuration != null && (
              <span data-testid="asr-duration">
                אורך: {Math.round(Number(r.asrDuration) / 60)} דק&apos;
              </span>
            )}
          </div>
          {r.transcript ? (
            <ExpandableText text={r.transcript} limit={800} testId="asr-transcript" />
          ) : (
            <p className="text-sm text-muted-foreground">התמלול בעיבוד...</p>
          )}
        </ResultCard>
      )}

      {/* Content Cleaning */}
      {r.cleaning && r.cleanedText && (
        <ResultCard icon="🧹" title="טקסט מנוקה" testId="result-cleaning">
          <ExpandableText text={r.cleanedText} limit={600} testId="cleaned-text" />
        </ResultCard>
      )}

      {/* NER / Source Linking */}
      {r.nerLinking && (r.entities || r.linkedSources) && (
        <ResultCard icon="🔗" title="זיהוי מקורות וישויות" testId="result-ner">
          {r.entities && (
            <div className="mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground mb-1 uppercase">ישויות שזוהו</h3>
              <div className="flex flex-wrap gap-1">
                {r.entities.slice(0, 20).map((e, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-700" data-testid={`entity-${i}`}>
                    {e.text}
                    {e.type && <span className="text-muted-foreground ml-1">({e.type})</span>}
                  </span>
                ))}
                {r.entities.length > 20 && (
                  <span className="text-xs text-muted-foreground">+{r.entities.length - 20} נוספות</span>
                )}
              </div>
            </div>
          )}
          {r.linkedSources && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-1 uppercase">מקורות מקושרים</h3>
              <ul className="text-sm space-y-1">
                {r.linkedSources.slice(0, 10).map((s, i) => (
                  <li key={i}>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline dark:text-blue-400">{s.title}</a>
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
      {r.summarize && (r.shortSummary || r.keyPoints) && (
        <ResultCard icon="📋" title="סיכום" testId="result-summarization">
          {r.shortSummary && (
            <div className="mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground mb-1 uppercase">סיכום קצר</h3>
              <p className="text-sm leading-relaxed" data-testid="summary-short">{r.shortSummary}</p>
            </div>
          )}
          {r.keyPoints && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-1 uppercase">נקודות מפתח</h3>
              <ul className="list-disc list-inside text-sm space-y-1" data-testid="summary-keypoints">
                {r.keyPoints.slice(0, 8).map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
        </ResultCard>
      )}

      {/* Structured Notes */}
      {r.structured && r.notesMarkdown && (
        <ResultCard icon="📝" title="תיעוד מובנה" testId="result-structured-notes">
          <ExpandableText text={r.notesMarkdown} limit={2000} testId="notes-markdown" />
        </ResultCard>
      )}

      {/* Diagram */}
      {r.diagram && r.mermaidSrc && (
        <ResultCard icon="📊" title="תרשים מושגים" testId="result-diagram">
          <pre className="text-xs bg-muted rounded p-3 overflow-auto" data-testid="diagram-mermaid">{r.mermaidSrc}</pre>
        </ResultCard>
      )}

      {/* Citation Verifier */}
      {r.citations && (
        <ResultCard icon="🔍" title="אימות ציטוטים" testId="result-citations">
          <div className="flex gap-4 mb-3">
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm dark:bg-green-900 dark:text-green-300" data-testid="citations-verified">
              ✓ אומתו: {r.verifiedCount}
            </span>
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm dark:bg-red-900 dark:text-red-300" data-testid="citations-failed">
              ✗ נכשלו: {r.failedCount}
            </span>
          </div>
          {r.matchReport && (
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap" data-testid="citations-report">
              {r.matchReport.slice(0, 800)}
            </pre>
          )}
        </ResultCard>
      )}

      {/* QA Gate */}
      {r.qa && (
        <ResultCard icon="✅" title="בקרת איכות" testId="result-qa">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="qa-score">
              {Math.round(Number(r.qaScore ?? 0) * (Number(r.qaScore ?? 0) <= 1 ? 100 : 1))}%
            </div>
            <span className="text-sm text-muted-foreground">ציון כללי</span>
          </div>
          {r.fixList && r.fixList.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">תיקונים מומלצים:</h3>
              <ul className="text-xs space-y-1" data-testid="qa-fix-list">
                {r.fixList.slice(0, 5).map((fix, i) => (
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
      {r.publish && (
        <ResultCard icon="🚀" title="יצוא והפצה" testId="result-publish">
          {r.publishReady === true && (
            <p className="text-green-600 text-sm font-medium mb-2 dark:text-green-400" data-testid="publish-ready">✅ מוכן לפרסום</p>
          )}
          {r.publishedUrl && (
            <a
              href={r.publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline text-sm break-all dark:text-blue-400"
              data-testid="publish-url"
            >
              {r.publishedUrl}
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
  );
}
