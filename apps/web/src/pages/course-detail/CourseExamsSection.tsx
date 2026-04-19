/**
 * CourseExamsSection — exam management links for instructors and a "Take Exam"
 * entry for students on the course detail page.
 *
 * Instructor links (canEdit): Item Bank, Blueprints, Analytics, AI Generator.
 * Student entry: "Take Exam" button linking to the first published blueprint.
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileQuestion,
  ClipboardList,
  BarChart,
  Sparkles,
  PlayCircle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExamLink {
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

interface Props {
  courseId: string;
  canEdit: boolean;
  /**
   * If the course has published blueprints, pass the first blueprintId here so
   * students can start an exam directly from the course page.
   */
  publishedBlueprintId?: string | null;
}

export function CourseExamsSection({
  courseId,
  canEdit,
  publishedBlueprintId,
}: Props) {
  const { t } = useTranslation('courses');
  const navigate = useNavigate();

  const instructorLinks: ExamLink[] = [
    {
      label: t('examItemBank', 'Item Bank'),
      description: t('examItemBankDesc', 'Manage question items'),
      icon: <FileQuestion className="h-4 w-4 text-blue-500 dark:text-blue-400" />,
      path: `/courses/${courseId}/exams/items`,
    },
    {
      label: t('examBlueprints', 'Blueprints'),
      description: t('examBlueprintsDesc', 'Design exam blueprints'),
      icon: <ClipboardList className="h-4 w-4 text-violet-500 dark:text-violet-400" />,
      path: `/courses/${courseId}/exams/blueprints`,
    },
    {
      label: t('examAnalytics', 'Analytics'),
      description: t('examAnalyticsDesc', 'View exam performance'),
      icon: <BarChart className="h-4 w-4 text-green-500 dark:text-green-400" />,
      path: `/courses/${courseId}/exams/analytics`,
    },
    {
      label: t('examAiGenerator', 'AI Generator'),
      description: t('examAiGeneratorDesc', 'Generate items with AI'),
      icon: <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />,
      path: `/courses/${courseId}/exams/generate`,
    },
  ];

  const showInstructor = canEdit;
  const showStudent = !canEdit && publishedBlueprintId;

  if (!showInstructor && !showStudent) return null;

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b">
        <span className="text-sm font-medium flex items-center gap-2">
          📝 {t('exams', 'Exams')}
        </span>
      </div>

      {showInstructor && (
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
          {instructorLinks.map((link) => (
            <button
              key={link.path}
              data-testid={`exam-link-${link.path.split('/').pop() ?? 'link'}`}
              onClick={() => navigate(link.path)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted text-left transition-colors"
            >
              <span className="shrink-0">{link.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">{link.label}</span>
                <span className="block text-xs text-muted-foreground truncate">
                  {link.description}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}

      {showStudent && publishedBlueprintId && (
        <div className="px-4 py-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('examAvailable', 'An exam is available for this course')}
          </p>
          <Button
            size="sm"
            className="gap-2 shrink-0"
            data-testid="take-exam-btn"
            onClick={() =>
              navigate(`/exams/${publishedBlueprintId}/start`)
            }
          >
            <PlayCircle className="h-4 w-4" />
            {t('takeExam', 'Take Exam')}
          </Button>
        </div>
      )}
    </div>
  );
}
