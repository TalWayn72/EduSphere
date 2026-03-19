/**
 * useExamApi — TanStack-style hooks wrapping urql for the Certification Exam System.
 * Follows the same pattern as useGradeQuiz.ts.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'urql';
import type { ExamItem, ExamBlueprint } from '@/types/exam-entities';
import type {
  ExamItemFilterInput,
  CreateExamItemInput,
  UpdateExamItemInput,
  CreateExamBlueprintInput,
  UpdateExamBlueprintInput,
  GenerateExamItemsInput,
  ExamItemGenerationResult,
} from '@/types/exam-inputs';
import {
  EXAM_ITEM_BANK_QUERY,
  EXAM_ITEM_QUERY,
  CREATE_EXAM_ITEM_MUTATION,
  UPDATE_EXAM_ITEM_MUTATION,
  RETIRE_EXAM_ITEM_MUTATION,
  GENERATE_EXAM_ITEMS_MUTATION,
  EXAM_BLUEPRINTS_QUERY,
  EXAM_BLUEPRINT_QUERY,
  CREATE_EXAM_BLUEPRINT_MUTATION,
  UPDATE_EXAM_BLUEPRINT_MUTATION,
  COURSE_MODULES_QUERY,
} from '@/lib/graphql/exam.operations';

// ── Item Bank ────────────────────────────────────────────────────────────────

interface ItemBankResult {
  items: ExamItem[];
  totalCount: number;
  fetching: boolean;
  error: string | null;
}

export function useExamItemBank(
  courseId: string,
  filters?: ExamItemFilterInput,
  first = 20,
  after?: string,
): ItemBankResult {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [result] = useQuery({
    query: EXAM_ITEM_BANK_QUERY,
    variables: { courseId, filters, first, after },
    pause: !mounted,
  });

  return {
    items: result.data?.examItemBank?.nodes ?? [],
    totalCount: result.data?.examItemBank?.totalCount ?? 0,
    fetching: result.fetching,
    error: result.error?.message ?? null,
  };
}

export function useExamItem(itemId: string | undefined) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [result] = useQuery({
    query: EXAM_ITEM_QUERY,
    variables: { id: itemId ?? '' },
    pause: !mounted || !itemId,
  });

  return {
    item: result.data?.examItem as ExamItem | null ?? null,
    fetching: result.fetching,
    error: result.error?.message ?? null,
  };
}

// ── Item Mutations ───────────────────────────────────────────────────────────

export function useCreateExamItem() {
  const [, execute] = useMutation(CREATE_EXAM_ITEM_MUTATION);
  return useCallback(
    (input: CreateExamItemInput) => execute({ input }),
    [execute],
  );
}

export function useUpdateExamItem() {
  const [, execute] = useMutation(UPDATE_EXAM_ITEM_MUTATION);
  return useCallback(
    (id: string, input: UpdateExamItemInput) => execute({ id, input }),
    [execute],
  );
}

export function useRetireExamItem() {
  const [, execute] = useMutation(RETIRE_EXAM_ITEM_MUTATION);
  return useCallback((id: string) => execute({ id }), [execute]);
}

export function useGenerateExamItems() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [, execute] = useMutation(GENERATE_EXAM_ITEMS_MUTATION);

  const generate = useCallback(
    async (input: GenerateExamItemsInput): Promise<ExamItemGenerationResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await execute({ input });
        if (!mountedRef.current) return null;
        if (result.error) {
          setError(result.error.message);
          return null;
        }
        return result.data?.generateExamItems ?? null;
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Generation failed');
        }
        return null;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [execute],
  );

  return { generate, loading, error };
}

// ── Blueprints ───────────────────────────────────────────────────────────────

export function useExamBlueprints(courseId: string) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [result] = useQuery({
    query: EXAM_BLUEPRINTS_QUERY,
    variables: { courseId },
    pause: !mounted,
  });

  return {
    blueprints: (result.data?.examBlueprints ?? []) as ExamBlueprint[],
    fetching: result.fetching,
    error: result.error?.message ?? null,
  };
}

export function useExamBlueprint(blueprintId: string | undefined) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [result] = useQuery({
    query: EXAM_BLUEPRINT_QUERY,
    variables: { id: blueprintId ?? '' },
    pause: !mounted || !blueprintId,
  });

  return {
    blueprint: result.data?.examBlueprint as ExamBlueprint | null ?? null,
    fetching: result.fetching,
    error: result.error?.message ?? null,
  };
}

export function useCreateExamBlueprint() {
  const [, execute] = useMutation(CREATE_EXAM_BLUEPRINT_MUTATION);
  return useCallback(
    (input: CreateExamBlueprintInput) => execute({ input }),
    [execute],
  );
}

export function useUpdateExamBlueprint() {
  const [, execute] = useMutation(UPDATE_EXAM_BLUEPRINT_MUTATION);
  return useCallback(
    (id: string, input: UpdateExamBlueprintInput) => execute({ id, input }),
    [execute],
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface CourseModule { id: string; title: string; orderIndex: number }

export function useCourseModules(courseId: string) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [result] = useQuery({
    query: COURSE_MODULES_QUERY,
    variables: { courseId },
    pause: !mounted,
  });

  return {
    modules: (result.data?.course?.modules ?? []) as CourseModule[],
    fetching: result.fetching,
  };
}
