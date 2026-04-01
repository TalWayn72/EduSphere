/**
 * ExamItemEditorPage — create/edit a single certification exam item.
 * Route: /courses/:courseId/exams/items/new | /courses/:courseId/exams/items/:itemId
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { PageHeader } from '@/components/PageHeader';
import { useAuthRole } from '@/hooks/useAuthRole';
import {
  useExamItem,
  useCreateExamItem,
  useUpdateExamItem,
} from '@/hooks/useExamApi';
import { ExamItemFormFields } from './ExamItemFormFields';
import { ExamItemIrtDisplay } from './ExamItemIrtDisplay';
import type { BloomLevel } from '@/types/exam';

const ALLOWED_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);

const BLOOM_LEVELS: BloomLevel[] = [
  'REMEMBER',
  'UNDERSTAND',
  'APPLY',
  'ANALYZE',
  'EVALUATE',
  'CREATE',
];

const schema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  bloomLevel: z.enum([
    'REMEMBER',
    'UNDERSTAND',
    'APPLY',
    'ANALYZE',
    'EVALUATE',
    'CREATE',
  ]),
  questionType: z.enum([
    'MULTIPLE_CHOICE',
    'DRAG_ORDER',
    'HOTSPOT',
    'MATCHING',
    'FILL_BLANK',
  ] as const),
  questionText: z.string().min(1, 'Question text is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

type FormData = z.infer<typeof schema>;

export function ExamItemEditorPage() {
  const { courseId, itemId } = useParams<{
    courseId: string;
    itemId: string;
  }>();
  const navigate = useNavigate();
  const role = useAuthRole();
  const isEdit = Boolean(itemId);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { item, fetching } = useExamItem(itemId);
  const createItem = useCreateExamItem();
  const updateItem = useUpdateExamItem();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      domain: '',
      bloomLevel: 'REMEMBER',
      questionType: 'MULTIPLE_CHOICE',
      questionText: '',
      difficulty: 'medium',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (item) {
      const qd = item.questionData;
      const text =
        typeof qd === 'object' && qd !== null && 'question' in qd
          ? (qd as { question: string }).question
          : '';
      const qType =
        typeof qd === 'object' && qd !== null && 'type' in qd
          ? (qd as { type: string }).type
          : 'MULTIPLE_CHOICE';
      form.reset({
        domain: item.domainTag,
        bloomLevel: item.bloomLevel,
        questionType: qType as FormData['questionType'],
        questionText: text,
        difficulty:
          (item.irtB ?? 0) <= -0.5
            ? 'easy'
            : (item.irtB ?? 0) >= 1.0
              ? 'hard'
              : 'medium',
      });
    }
  }, [item, form]);

  if (mounted && role && !ALLOWED_ROLES.has(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: FormData) => {
    const questionData = {
      type: data.questionType,
      question: data.questionText,
      options: [],
      correctOptionIds: [],
    };

    if (isEdit && itemId) {
      const result = await updateItem(itemId, {
        domainTag: data.domain,
        bloomLevel: data.bloomLevel,
        questionData: questionData as never,
      });
      if (result.error) {
        toast.error('Failed to update item');
        return;
      }
      toast.success('Item updated');
    } else {
      const result = await createItem({
        courseId: courseId ?? '',
        domainTag: data.domain,
        bloomLevel: data.bloomLevel,
        questionData: questionData as never,
      });
      if (result.error) {
        toast.error('Failed to create item');
        return;
      }
      toast.success('Item created');
    }
    void navigate(`/courses/${courseId}/exams/items`);
  };

  return (
    <Layout>
      <PageShell size="full">
        <PageHeader title={isEdit ? 'Edit Exam Item' : 'Create Exam Item'} />
        <div className="container mx-auto p-6 max-w-2xl">
          {fetching && <p className="text-muted-foreground">Loading...</p>}
          <ExamItemFormFields
            form={form}
            bloomLevels={BLOOM_LEVELS}
            isEdit={isEdit}
            onSubmit={onSubmit}
            onBack={() => void navigate(`/courses/${courseId}/exams/items`)}
          />
          {isEdit && item && <ExamItemIrtDisplay item={item} />}
        </div>
      </PageShell>
    </Layout>
  );
}
