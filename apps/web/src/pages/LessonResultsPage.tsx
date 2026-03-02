import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { LESSON_QUERY } from '@/lib/graphql/lesson.queries';

interface PipelineResult {
  id: string;
  moduleName: string;
  outputType: string;
  outputData: Record<string, unknown> | null;
  fileUrl?: string;
}

interface LessonQueryData {
  lesson: {
    id: string;
    title: string;
    status: string;
    pipeline?: {
      currentRun?: {
        id: string;
        status: string;
        results: PipelineResult[];
      };
    };
  } | null;
}

function getResultByModule(results: PipelineResult[], moduleName: string) {
  return results.find((r) => r.moduleName === moduleName);
}

export function LessonResultsPage() {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();
  const navigate = useNavigate();

  const [{ data, fetching }] = useQuery<LessonQueryData>({
    query: LESSON_QUERY,
    variables: { id: lessonId },
    pause: !lessonId,
  });

  if (fetching) {
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
        <div className="p-6 text-gray-500">השיעור לא נמצא</div>
      </Layout>
    );
  }

  const results = lesson.pipeline?.currentRun?.results ?? [];
  const summarization = getResultByModule(results, 'SUMMARIZATION');
  const structuredNotes = getResultByModule(results, 'STRUCTURED_NOTES');
  const diagram = getResultByModule(results, 'DIAGRAM_GENERATOR');
  const citationVerifier = getResultByModule(results, 'CITATION_VERIFIER');
  const qa = getResultByModule(results, 'QA_GATE');

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/courses/${courseId}/lessons/${lessonId}`)}
          >
            ← {lesson.title}
          </Button>
          <h1 className="text-2xl font-bold">תוצאות Pipeline</h1>
        </div>

        {results.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">⏳</p>
            <p>אין תוצאות עדיין. הפעל את ה-Pipeline תחילה.</p>
            <Button
              className="mt-4"
              onClick={() =>
                navigate(`/courses/${courseId}/lessons/${lessonId}/pipeline`)
              }
            >
              פתח Pipeline Builder
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {summarization && (
            <div className="bg-white border rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">📋 סיכום</h2>
              {Boolean(summarization.outputData?.['shortSummary']) && (
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">
                    סיכום קצר
                  </h3>
                  <p className="text-sm leading-relaxed">
                    {String(summarization.outputData?.['shortSummary'])}
                  </p>
                </div>
              )}
              {Array.isArray(summarization.outputData?.['keyPoints']) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">
                    נקודות מפתח
                  </h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {(summarization.outputData['keyPoints'] as string[])
                      .slice(0, 8)
                      .map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {Boolean(structuredNotes?.outputData?.['outputMarkdown']) && (
            <div className="bg-white border rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">📝 תיעוד מובנה</h2>
              <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed text-gray-700">
                {String(structuredNotes?.outputData?.['outputMarkdown']).slice(
                  0,
                  2000
                )}
              </pre>
            </div>
          )}

          {Boolean(diagram?.outputData?.['mermaidSrc']) && (
            <div className="bg-white border rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">📊 תרשים מושגים</h2>
              <pre className="text-xs bg-gray-50 rounded p-3 overflow-auto">
                {String(diagram?.outputData?.['mermaidSrc'])}
              </pre>
            </div>
          )}

          {citationVerifier && (
            <div className="bg-white border rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">🔍 אימות ציטוטים</h2>
              <div className="flex gap-4 mb-3">
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                  ✓ אומתו:{' '}
                  {(
                    citationVerifier.outputData?.[
                      'verifiedCitations'
                    ] as unknown[]
                  )?.length ?? 0}
                </span>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                  ✗ נכשלו:{' '}
                  {(
                    citationVerifier.outputData?.[
                      'failedCitations'
                    ] as unknown[]
                  )?.length ?? 0}
                </span>
              </div>
              {Boolean(citationVerifier.outputData?.['matchReport']) && (
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                  {String(citationVerifier.outputData?.['matchReport']).slice(
                    0,
                    800
                  )}
                </pre>
              )}
            </div>
          )}

          {qa && (
            <div className="bg-white border rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">✅ בקרת איכות</h2>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round(
                    Number(qa.outputData?.['overallScore'] ?? 0) * 100
                  )}
                  %
                </div>
                <span className="text-sm text-gray-500">ציון כללי</span>
              </div>
              {Array.isArray(qa.outputData?.['fixList']) &&
                (qa.outputData['fixList'] as unknown[]).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      תיקונים מומלצים:
                    </h3>
                    <ul className="text-xs space-y-1">
                      {(
                        qa.outputData['fixList'] as Array<{
                          description: string;
                          severity: string;
                        }>
                      )
                        .slice(0, 5)
                        .map((fix, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span
                              className={
                                fix.severity === 'HIGH'
                                  ? 'text-red-500'
                                  : fix.severity === 'MEDIUM'
                                    ? 'text-yellow-500'
                                    : 'text-gray-400'
                              }
                            >
                              ●
                            </span>
                            <span>{fix.description}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
