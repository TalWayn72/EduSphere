import React from 'react';
import { useParams } from 'react-router-dom';

export function ExamAnalyticsDashboard() {
  const { courseId } = useParams<{ courseId: string }>();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Exam Analytics</h1>
      <p className="text-muted-foreground">
        Course: {courseId} — Analytics dashboard coming soon.
      </p>
    </div>
  );
}
