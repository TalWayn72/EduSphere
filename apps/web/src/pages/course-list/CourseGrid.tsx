import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Loader2 } from 'lucide-react';
import { CourseCard } from './CourseCard';
import type { CourseItem } from './types';

interface CourseGridProps {
  courses: CourseItem[];
  fetching: boolean;
  isInstructor: boolean;
  enrolledCourseIds: Set<string>;
  isPublished: (course: CourseItem) => boolean;
  onEnroll: (e: React.MouseEvent, courseId: string, title: string) => void;
  onTogglePublish: (
    e: React.MouseEvent,
    courseId: string,
    current: boolean
  ) => void;
}

export const CourseGrid = React.memo(function CourseGrid({
  courses,
  fetching,
  isInstructor,
  enrolledCourseIds,
  isPublished,
  onEnroll,
  onTogglePublish,
}: CourseGridProps) {
  const { t } = useTranslation('courses');

  if (fetching) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{t('loadingCourses')}</span>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('noCoursesYet')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => {
        const published = isPublished(course);
        const isEnrolled = enrolledCourseIds.has(course.id);
        return (
          <CourseCard
            key={course.id}
            course={course}
            published={published}
            isEnrolled={isEnrolled}
            isInstructor={isInstructor}
            onEnroll={onEnroll}
            onTogglePublish={onTogglePublish}
          />
        );
      })}
    </div>
  );
});
