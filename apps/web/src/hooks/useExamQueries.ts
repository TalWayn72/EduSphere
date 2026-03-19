import { useState, useEffect } from 'react';
import { useQuery } from 'urql';
import type { ExamSession, ExamResult, ExamBlueprint } from '@/types/exam-entities';

const EXAM_BLUEPRINT_QUERY = `
  query ExamBlueprint($id: ID!) {
    examBlueprint(id: $id) {
      id courseId title description status totalQuestions
      timeLimitMinutes passingMethod passingScore
      domainDistribution bloomDistribution
      shuffleQuestions shuffleAnswers
      maxRetakes retakeCooldownHours
      isAdaptive catMinItems catMaxItems
      version createdAt
    }
  }
`;

const EXAM_SESSION_QUERY = `
  query ExamSession($id: ID!) {
    examSession(id: $id) {
      id blueprintId userId status
      attemptNumber startedAt submittedAt
      timeRemainingSeconds questionOrder
      isAdaptive currentQuestionIndex
    }
  }
`;

const EXAM_RESULT_QUERY = `
  query ExamResult($sessionId: ID!) {
    examResult(sessionId: $sessionId) {
      id sessionId blueprintId passed
      rawScore scaledScore thetaEstimate sem
      confidenceInterval
      domainScores { domain correct total scaledScore }
      bloomScores { level correct total }
      gradedAt
    }
  }
`;

export function useExamBlueprint(blueprintId: string) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [result] = useQuery({
    query: EXAM_BLUEPRINT_QUERY,
    variables: { id: blueprintId },
    pause: !mounted || !blueprintId,
  });
  return {
    blueprint: result.data?.examBlueprint as ExamBlueprint | undefined,
    loading: result.fetching,
    error: result.error?.message ?? null,
  };
}

export function useExamSession(sessionId: string) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [result] = useQuery({
    query: EXAM_SESSION_QUERY,
    variables: { id: sessionId },
    pause: !mounted || !sessionId,
  });
  return {
    session: result.data?.examSession as ExamSession | undefined,
    loading: result.fetching,
    error: result.error?.message ?? null,
  };
}

export function useExamResult(sessionId: string) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [result] = useQuery({
    query: EXAM_RESULT_QUERY,
    variables: { sessionId },
    pause: !mounted || !sessionId,
  });
  return {
    result: result.data?.examResult as ExamResult | undefined,
    loading: result.fetching,
    error: result.error?.message ?? null,
  };
}
