/**
 * ComplianceLibraryPage — Phase 64 (F-038).
 * Route: /library/compliance
 *
 * Grid of 8 compliance course cards.
 * "Add to my org" button calls cloneComplianceCourse mutation.
 * Mounted guard on all queries.
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'urql';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { BookOpen, ShieldCheck } from 'lucide-react';

const COMPLIANCE_COURSES_QUERY = `
  query ComplianceCourses {
    complianceCourses {
      id
      title
      description
      category
      tags
      isTemplate
    }
  }
`;

const CLONE_COURSE_MUTATION = `
  mutation CloneComplianceCourse($courseId: ID!) {
    cloneComplianceCourse(courseId: $courseId) {
      id
      title
    }
  }
`;

interface ComplianceCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  isTemplate: boolean;
}

const INDUSTRY_BADGE_COLORS: Record<string, string> = {
  FERPA: 'bg-blue-100 text-blue-800',
  GDPR: 'bg-purple-100 text-purple-800',
  HIPAA: 'bg-green-100 text-green-800',
  cybersecurity: 'bg-red-100 text-red-800',
  AI: 'bg-indigo-100 text-indigo-800',
};

export function ComplianceLibraryPage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [cloning, setCloning] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [result] = useQuery<{ complianceCourses: ComplianceCourse[] }>({
    query: COMPLIANCE_COURSES_QUERY,
    pause: !mounted,
  });

  const [, cloneMutation] = useMutation<
    { cloneComplianceCourse: { id: string; title: string } },
    { courseId: string }
  >(CLONE_COURSE_MUTATION);

  const handleAddToOrg = async (courseId: string) => {
    setCloning(courseId);
    const res = await cloneMutation({ courseId });
    setCloning(null);
    if (res.data?.cloneComplianceCourse) {
      void navigate(`/courses/${res.data.cloneComplianceCourse.id}/edit`);
    }
  };

  return (
    <main className="p-6 max-w-6xl mx-auto" aria-label="Compliance Course Library">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-indigo-600" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold">Compliance Course Library</h1>
            <p className="text-muted-foreground mt-1">
              Pre-built, ready-to-deploy compliance courses. Click &ldquo;Add to my
              org&rdquo; to customize.
            </p>
          </div>
        </div>
      </header>

      {!mounted || result.fetching ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          aria-busy="true"
          aria-label="Loading compliance courses"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : result.error ? (
        <p className="text-sm text-red-600" role="alert">
          Unable to load compliance library.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(result.data?.complianceCourses ?? []).map((course) => (
            <Card key={course.id} className="flex flex-col">
              <CardHeader className="flex-1">
                <div className="flex items-start gap-2">
                  <BookOpen
                    className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <CardTitle className="text-base leading-snug">
                    {course.title}
                  </CardTitle>
                </div>
                <CardDescription className="mt-2 text-xs">
                  {course.description}
                </CardDescription>
                <div className="flex flex-wrap gap-1 mt-3">
                  {course.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        INDUSTRY_BADGE_COLORS[tag] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </CardHeader>
              <CardFooter>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={cloning === course.id}
                  onClick={() => void handleAddToOrg(course.id)}
                  data-testid={`add-course-${course.id}`}
                >
                  {cloning === course.id ? 'Adding\u2026' : 'Add to my org'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

export default ComplianceLibraryPage;
