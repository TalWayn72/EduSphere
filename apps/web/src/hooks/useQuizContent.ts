import { useQuery } from 'urql';
import { CONTENT_ITEM_QUERY } from '@/lib/graphql/content.queries';
import { QuizContentSchema } from '../lib/quiz-schema-client';
import type { QuizContent } from '@/types/quiz';

interface ContentItemRaw {
  id: string;
  contentType: string;
  content?: string | null;
  title: string;
}

interface UseQuizContentReturn {
  isQuiz: boolean;
  quizContent: QuizContent | null;
  title: string;
  fetching: boolean;
  error: string | null;
}

export function useQuizContent(contentItemId: string): UseQuizContentReturn {
  const [result] = useQuery<{ contentItem?: ContentItemRaw | null }>({
    query: CONTENT_ITEM_QUERY,
    variables: { id: contentItemId },
    pause: !contentItemId,
  });

  const item = result.data?.contentItem;
  const isQuiz = item?.contentType === 'QUIZ';

  let quizContent: QuizContent | null = null;
  if (isQuiz && item?.content) {
    try {
      const raw = JSON.parse(item.content);
      const parsed = QuizContentSchema.safeParse(raw);
      if (parsed.success) quizContent = parsed.data as QuizContent;
    } catch {
      // invalid JSON — leave null
    }
  }

  return {
    isQuiz,
    quizContent,
    title: item?.title ?? '',
    fetching: result.fetching,
    error: result.error?.message ?? null,
  };
}
