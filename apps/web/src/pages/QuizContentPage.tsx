/**
 * QuizContentPage — renders quiz content items using QuizPlayer.
 * Shown when a content item has contentType === 'QUIZ'.
 */
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { QuizPlayer } from '@/components/quiz/QuizPlayer';
import { useQuizContent } from '@/hooks/useQuizContent';

function SkeletonBlock() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-4 bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}

export function QuizContentPage() {
  const { contentId = '' } = useParams<{ contentId: string }>();
  const { isQuiz, quizContent, title, fetching, error } =
    useQuizContent(contentId);

  return (
    <Layout>
      <PageShell size="md">
        <PageHeader
          title={title ?? 'Quiz'}
          breadcrumbs={[
            { label: 'Courses', href: '/courses' },
            { label: title ?? 'Quiz' },
          ]}
        />

        <div className="space-y-4">
        {fetching && (
          <Card>
            <CardContent className="p-6">
              <SkeletonBlock />
            </CardContent>
          </Card>
        )}

        {!fetching && error && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-red-600 dark:text-red-400">
              Failed to load quiz: {error}
            </CardContent>
          </Card>
        )}

        {!fetching && !error && !isQuiz && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              This content item is not a quiz.
            </CardContent>
          </Card>
        )}

        {!fetching && !error && isQuiz && quizContent && (
          <QuizPlayer quizContent={quizContent} contentItemId={contentId} />
        )}

        {!fetching && !error && isQuiz && !quizContent && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Quiz data is missing or invalid.
            </CardContent>
          </Card>
        )}
        </div>
      </PageShell>
    </Layout>
  );
}
