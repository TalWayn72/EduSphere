/**
 * ExamItemGeneratorPage — AI-powered exam item generation.
 * Route: /courses/:courseId/exams/generate
 */
import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { PageHeader } from '@/components/PageHeader';
import { useAuthRole } from '@/hooks/useAuthRole';
import {
  useGenerateExamItems,
  useCreateExamItem,
  useCourseModules,
} from '@/hooks/useExamApi';
import { ExamItemReviewCard } from '@/components/exam/ExamItemReviewCard';
import { GeneratorForm } from './GeneratorForm';
import type { BloomLevel } from '@/types/exam';
import type { QuizItem } from '@/types/quiz';

const ALLOWED_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);

interface GeneratedItem {
  domainTag: string;
  bloomLevel: BloomLevel;
  questionData: QuizItem;
}

export function ExamItemGeneratorPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const role = useAuthRole();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { modules } = useCourseModules(courseId ?? '');
  const { generate, loading, error } = useGenerateExamItems();
  const createItem = useCreateExamItem();
  const [results, setResults] = useState<GeneratedItem[]>([]);

  if (mounted && role && !ALLOWED_ROLES.has(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGenerate = async (input: {
    moduleId?: string;
    domain: string;
    bloomLevel: BloomLevel;
    count: number;
    targetDifficulty: number;
  }) => {
    const result = await generate({
      courseId: courseId ?? '',
      moduleId: input.moduleId,
      domainTag: input.domain,
      bloomLevels: [input.bloomLevel],
      count: input.count,
      targetDifficulty: input.targetDifficulty,
    });
    if (result) {
      setResults(
        result.items.map((item) => ({
          domainTag: (item as unknown as Record<string, unknown>)
            .domainTag as string,
          bloomLevel: (item as unknown as Record<string, unknown>)
            .bloomLevel as BloomLevel,
          questionData: (item as unknown as Record<string, unknown>)
            .questionData as QuizItem,
        }))
      );
      toast.success(`Generated ${result.generatedCount} items`);
    }
  };

  const handleApprove = async (index: number) => {
    const item = results[index];
    if (!item) return;
    await createItem({
      courseId: courseId ?? '',
      domainTag: item.domainTag,
      bloomLevel: item.bloomLevel,
      questionData: item.questionData as unknown,
    });
    setResults((prev) => prev.filter((_, i) => i !== index));
    toast.success('Item approved and saved');
  };

  const handleReject = (index: number) => {
    setResults((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEdit = (_index: number) => {
    toast.info('Edit in the Item Editor after approving');
  };

  return (
    <Layout>
      <PageShell size="full">
        <PageHeader title="AI Exam Item Generator" />
        <div className="container mx-auto p-6 max-w-3xl space-y-6">
          <GeneratorForm
            modules={modules}
            loading={loading}
            onGenerate={handleGenerate}
          />

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Generated Items ({results.length})
              </h2>
              {results.map((item, i) => (
                <ExamItemReviewCard
                  key={`gen-${i}`}
                  item={item}
                  index={i}
                  onApprove={(idx) => {
                    void handleApprove(idx);
                  }}
                  onEdit={handleEdit}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}
        </div>
      </PageShell>
    </Layout>
  );
}
