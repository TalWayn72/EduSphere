/**
 * CourseLessonsSection — list of lessons for a course with status badges.
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { LessonSummary } from './types';

interface Props {
  courseId: string;
  lessons: LessonSummary[];
  canEdit: boolean;
}

function statusClasses(status: string): string {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-blue-100 text-blue-700';
    case 'READY':
      return 'bg-green-100 text-green-700';
    case 'PROCESSING':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function CourseLessonsSection({ courseId, lessons, canEdit }: Props) {
  const { t } = useTranslation('courses');
  const navigate = useNavigate();

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b">
        <span className="text-sm font-medium flex items-center gap-2">
          🎓 {t('lessons')}
        </span>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/courses/${courseId}/lessons/new`)}
          >
            + {t('addLesson')}
          </Button>
        )}
      </div>
      {lessons.length > 0 ? (
        <div className="divide-y">
          {lessons.map((lesson) => (
            <button
              key={lesson.id}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted text-sm text-left"
              onClick={() =>
                navigate(`/courses/${courseId}/lessons/${lesson.id}`)
              }
            >
              <span className="font-medium">{lesson.title}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses(lesson.status)}`}
              >
                {lesson.status}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          {canEdit
            ? t('noLessonsYetInstructor')
            : t('noLessonsYetStudent')}
        </div>
      )}
    </div>
  );
}
