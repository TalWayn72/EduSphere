/**
 * CreateLessonPage — 3-step wizard for creating a new lesson with pipeline template.
 * Route: /courses/:courseId/lessons/new
 *
 * Step 1: Lesson details (title, type, series, date)
 * Step 2: Add assets (YouTube URL, PDF upload)
 * Step 3: Select pipeline template (THEMATIC or SEQUENTIAL)
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { CREATE_LESSON_MUTATION } from '@/lib/graphql/lesson.queries';
import { useLessonPipelineStore } from '@/lib/lesson-pipeline.store';
import { CreateLessonStep1 } from './CreateLessonPage.step1';
import { CreateLessonStep2 } from './CreateLessonPage.step2';

export interface LessonFormData {
  title: string;
  type: 'THEMATIC' | 'SEQUENTIAL';
  series: string;
  lessonDate: string;
}

interface CreateLessonResult {
  createLesson: {
    id: string;
    courseId: string;
    title: string;
    status: string;
  };
}

export function CreateLessonPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<LessonFormData>({
    title: '',
    type: 'THEMATIC',
    series: '',
    lessonDate: '',
  });
  const [selectedTemplate, setSelectedTemplate] = useState<
    'THEMATIC' | 'SEQUENTIAL' | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const [{ fetching }, createLesson] = useMutation<CreateLessonResult>(
    CREATE_LESSON_MUTATION
  );
  const loadTemplate = useLessonPipelineStore((s) => s.loadTemplate);
  const user = getCurrentUser();

  const handleStep1Submit = (data: LessonFormData) => {
    setFormData(data);
    setStep(2);
  };

  const handleCreateLesson = async () => {
    if (!courseId || !user) return;
    const { data, error: mutError } = await createLesson({
      input: {
        courseId,
        title: formData.title,
        type: formData.type,
        series: formData.series || undefined,
        lessonDate: formData.lessonDate || undefined,
        instructorId: user.id,
      },
    });
    if (mutError) {
      setError(mutError.graphQLErrors?.[0]?.message ?? mutError.message);
      return;
    }
    if (data?.createLesson) {
      if (selectedTemplate) loadTemplate(selectedTemplate);
      navigate(`/courses/${courseId}/lessons/${data.createLesson.id}/pipeline`);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            ← חזרה
          </Button>
          <h1 className="text-2xl font-bold">יצירת שיעור חדש</h1>
        </div>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full ${
                s <= step ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <CreateLessonStep1
            initialData={formData}
            onSubmit={handleStep1Submit}
          />
        )}

        {step === 2 && (
          <CreateLessonStep2
            lessonId=""
            courseId={courseId ?? ''}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">בחר תבנית Pipeline</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div
                className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                  selectedTemplate === 'THEMATIC'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setSelectedTemplate('THEMATIC')}
              >
                <h3 className="font-semibold text-lg mb-1">🎯 שיעור הגות</h3>
                <p className="text-sm text-gray-600">
                  נושא נקבע ע&quot;י המרצה — 8 שלבי עיבוד
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  מתאים ל: הרב ישראל אביחי
                </p>
              </div>
              <div
                className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                  selectedTemplate === 'SEQUENTIAL'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
                onClick={() => setSelectedTemplate('SEQUENTIAL')}
              >
                <h3 className="font-semibold text-lg mb-1">📖 ספר עץ חיים</h3>
                <p className="text-sm text-gray-600">
                  לימוד על הסדר — 9 שלבים + אימות ציטוטים
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  מתאים ל: הרב יוסף טובול
                </p>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                חזרה
              </Button>
              <Button
                onClick={handleCreateLesson}
                disabled={fetching || !selectedTemplate}
                className="flex-1"
              >
                {fetching ? 'יוצר שיעור...' : 'צור שיעור והמשך ל-Pipeline'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
