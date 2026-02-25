import { useState } from 'react';
import { useQuery, useMutation } from 'urql';
import { Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MicrolessonCard, type MicrolessonData } from '@/components/MicrolessonCard';
import { DAILY_MICROLESSON_QUERY } from '@/lib/graphql/content-tier3.queries';
import { MARK_CONTENT_VIEWED_MUTATION } from '@/lib/graphql/content.queries';

interface DailyMicrolessonQueryResult {
  dailyMicrolesson: {
    id: string;
    title: string;
    content: string | null;
    contentType: string;
    duration: number | null;
  } | null;
}

function parseMicrolessonData(item: DailyMicrolessonQueryResult['dailyMicrolesson']): MicrolessonData | null {
  if (!item?.content) return null;
  try {
    const parsed = JSON.parse(item.content) as Partial<MicrolessonData>;
    return {
      id: item.id,
      objective: parsed.objective ?? '',
      conceptName: parsed.conceptName ?? item.title,
      body: parsed.body ?? '',
      durationSeconds: parsed.durationSeconds ?? (item.duration ?? 180),
      quizQuestion: parsed.quizQuestion,
    };
  } catch {
    return null;
  }
}

export function DailyLearningWidget() {
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [{ data, fetching, error }] = useQuery<DailyMicrolessonQueryResult>({
    query: DAILY_MICROLESSON_QUERY,
  });

  const [, markViewed] = useMutation(MARK_CONTENT_VIEWED_MUTATION);

  const lesson = data?.dailyMicrolesson
    ? parseMicrolessonData(data.dailyMicrolesson)
    : null;

  const handleComplete = async (lessonId: string) => {
    await markViewed({ contentItemId: lessonId });
    setCompleted(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-yellow-500" />
          Daily Learning
        </CardTitle>
        <CardDescription>
          {completed
            ? 'All done for today!'
            : "Today's 3-7 minute microlesson"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {fetching && (
          <p className="text-sm text-muted-foreground">Loading today's lesson...</p>
        )}
        {error && (
          <p className="text-sm text-destructive">Could not load lesson: {error.message}</p>
        )}
        {completed && (
          <div className="text-center py-6">
            <p className="text-2xl mb-2">All done for today!</p>
            <p className="text-sm text-muted-foreground">Come back tomorrow for your next lesson.</p>
          </div>
        )}
        {!fetching && !error && !lesson && !completed && (
          <p className="text-sm text-muted-foreground">No microlessons available yet.</p>
        )}
        {!completed && lesson && !started && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-center space-y-1">
              <p className="font-medium">{lesson.conceptName}</p>
              <p className="text-sm text-muted-foreground">{lesson.objective}</p>
            </div>
            <Button onClick={() => setStarted(true)} className="gap-2">
              <Zap className="h-4 w-4" />
              Start Today's Lesson
            </Button>
          </div>
        )}
        {!completed && lesson && started && (
          <MicrolessonCard
            lesson={lesson}
            currentIndex={0}
            totalCount={1}
            onComplete={handleComplete}
            isCompleted={false}
          />
        )}
      </CardContent>
    </Card>
  );
}
