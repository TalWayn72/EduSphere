import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import type { MockCourse } from './types';

interface CourseCardProps {
  course: MockCourse;
  progressLabel: string;
}

export const CourseCard = React.memo(function CourseCard({
  course,
  progressLabel,
}: CourseCardProps) {
  const progressStyle = useMemo(
    () => ({ width: `${course.progress}%` }),
    [course.progress]
  );

  return (
    <Link
      to={`/courses/${course.id}`}
      className="block rounded-xl border border-border bg-card p-4 hover:bg-card-hover transition-colors card-interactive shrink-0 w-64"
      aria-label={`Continue ${course.title}`}
      dir="ltr"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <BookOpen
          className="h-5 w-5 text-primary shrink-0 mt-0.5"
          aria-hidden
        />
        <span className="text-xs text-muted-foreground">
          {course.lastStudied}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-2">
        {course.title}
      </h3>
      <p className="text-xs text-muted-foreground mb-3">{course.instructor}</p>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progressLabel}</span>
          <span>{course.progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={progressStyle}
            role="progressbar"
            aria-valuenow={course.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    </Link>
  );
});
