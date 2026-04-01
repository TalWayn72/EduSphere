import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, EyeOff, CheckCircle2, Pencil, Globe } from 'lucide-react';
import type { CourseItem } from './types';

interface CourseCardProps {
  course: CourseItem;
  published: boolean;
  isEnrolled: boolean;
  isInstructor: boolean;
  onEnroll: (e: React.MouseEvent, courseId: string, title: string) => void;
  onTogglePublish: (
    e: React.MouseEvent,
    courseId: string,
    current: boolean
  ) => void;
}

export const CourseCard = React.memo(function CourseCard({
  course,
  published,
  isEnrolled,
  isInstructor,
  onEnroll,
  onTogglePublish,
}: CourseCardProps) {
  const { t } = useTranslation('courses');
  const navigate = useNavigate();

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer group relative"
      onClick={() => navigate(`/courses/${course.id}`)}
    >
      {isInstructor && !published && (
        <div className="absolute top-3 right-3 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
          {t('draft')}
        </div>
      )}
      {!isInstructor && isEnrolled && (
        <div className="absolute top-3 right-3 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
          {t('enrolled')}
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="text-4xl">
            {course.thumbnailUrl ?? '\uD83D\uDCDA'}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/courses/${course.id}`);
            }}
          >
            {t('open')}
          </Button>
        </div>
        <CardTitle className="text-xl leading-snug">{course.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {course.description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {course.estimatedHours != null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                {t('hoursEstimated', { hours: course.estimatedHours })}
              </span>
            </div>
          )}
          {!isInstructor && (
            <Button
              variant={isEnrolled ? 'secondary' : 'default'}
              size="sm"
              className="w-full mt-1 gap-1.5"
              onClick={(e) => onEnroll(e, course.id, course.title)}
            >
              {isEnrolled ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {t('enrolled')}
                </>
              ) : (
                t('enroll')
              )}
            </Button>
          )}

          {isInstructor && (
            <div className="flex gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/courses/${course.id}/edit`);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('edit')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={(e) => onTogglePublish(e, course.id, published)}
              >
                {published ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    {t('unpublishCourse')}
                  </>
                ) : (
                  <>
                    <Globe className="h-3.5 w-3.5" />
                    {t('publishCourse')}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
