import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  PROGRAM_QUERY,
  PROGRAM_PROGRESS_QUERY,
  MY_PROGRAM_ENROLLMENTS_QUERY,
  ENROLL_IN_PROGRAM_MUTATION,
} from '@/lib/graphql/programs.queries';

interface CredentialProgram {
  id: string;
  title: string;
  description: string;
  badgeEmoji: string;
  requiredCourseIds: string[];
  totalHours: number;
  published: boolean;
  enrollmentCount: number;
}

interface ProgramProgress {
  totalCourses: number;
  completedCourses: number;
  completedCourseIds: string[];
  percentComplete: number;
}

interface ProgramEnrollment {
  id: string;
  programId: string;
  enrolledAt: string;
  completedAt: string | null;
  certificateId: string | null;
}

export function ProgramDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [programResult] = useQuery<{ program: CredentialProgram | null }>({
    query: PROGRAM_QUERY,
    variables: { id: id ?? '' },
    pause: !id,
  });

  const [enrollmentsResult] = useQuery<{
    myProgramEnrollments: ProgramEnrollment[];
  }>({
    query: MY_PROGRAM_ENROLLMENTS_QUERY,
  });

  const [progressResult] = useQuery<{ programProgress: ProgramProgress }>({
    query: PROGRAM_PROGRESS_QUERY,
    variables: { programId: id ?? '' },
    pause: !id,
  });

  const [, enrollMutation] = useMutation(ENROLL_IN_PROGRAM_MUTATION);

  const program = programResult.data?.program;
  const progress = progressResult.data?.programProgress;
  const enrollments = enrollmentsResult.data?.myProgramEnrollments ?? [];
  const enrollment = enrollments.find((e) => e.programId === id);
  const isEnrolled = Boolean(enrollment);
  const isCompleted = Boolean(enrollment?.completedAt);

  const handleEnroll = async (): Promise<void> => {
    if (!id) return;
    await enrollMutation({ programId: id });
  };

  if (programResult.fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!program) {
    return <div className="p-6 text-destructive">Program not found.</div>;
  }

  const completedSet = new Set(progress?.completedCourseIds ?? []);
  const totalCourses = program.requiredCourseIds.length;
  const completedCourses = progress?.completedCourses ?? 0;
  const pct = progress?.percentComplete ?? 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate('/programs')}
      >
        Back to Programs
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start gap-4">
            <span className="text-6xl">{program.badgeEmoji}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-2xl">{program.title}</CardTitle>
                {isCompleted && (
                  <Badge className="bg-green-500">Completed</Badge>
                )}
                {isEnrolled && !isCompleted && (
                  <Badge variant="secondary">In Progress</Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-2">
                {program.description}
              </p>
              <div className="flex gap-4 text-sm text-muted-foreground mt-3">
                <span>{totalCourses} courses required</span>
                <span>{program.totalHours}h total</span>
                <span>{program.enrollmentCount} learners enrolled</span>
              </div>
            </div>
          </div>
        </CardHeader>

        {isEnrolled && (
          <CardContent>
            <div className="mb-1 flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>
                {completedCourses}/{totalCourses} courses
              </span>
            </div>
            <Progress
              value={pct}
              className="h-3"
              aria-label={`${pct}% complete`}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {pct}% complete
            </p>
          </CardContent>
        )}
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Required Courses</CardTitle>
        </CardHeader>
        <CardContent>
          {program.requiredCourseIds.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No courses defined yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {program.requiredCourseIds.map((courseId, idx) => {
                const done = completedSet.has(courseId);
                return (
                  <li key={courseId} className="flex items-center gap-3">
                    <span
                      className={`text-lg ${done ? 'text-green-500' : 'text-muted-foreground'}`}
                    >
                      {done ? '✓' : '○'}
                    </span>
                    <span
                      className={`text-sm cursor-pointer hover:underline ${done ? 'text-green-700' : ''}`}
                      onClick={() => navigate(`/courses/${courseId}`)}
                    >
                      Course {idx + 1}: {courseId.slice(0, 8)}…
                    </span>
                    {done && (
                      <Badge
                        variant="outline"
                        className="text-xs text-green-600 border-green-600"
                      >
                        Done
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {isCompleted && enrollment?.certificateId ? (
          <Button className="bg-green-500 hover:bg-green-600">
            View Nanodegree Certificate
          </Button>
        ) : isEnrolled ? (
          <Button onClick={() => navigate('/courses')}>
            Continue Learning
          </Button>
        ) : (
          <Button onClick={handleEnroll}>Enroll in Program</Button>
        )}
      </div>
    </div>
  );
}
