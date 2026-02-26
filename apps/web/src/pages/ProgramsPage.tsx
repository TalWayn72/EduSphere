import React from 'react';
import { useQuery, useMutation } from 'urql';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  PROGRAMS_QUERY,
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

interface ProgramEnrollment {
  id: string;
  programId: string;
  completedAt: string | null;
  certificateId: string | null;
}

export function ProgramsPage(): React.ReactElement {
  const navigate = useNavigate();
  const [programsResult] = useQuery<{ programs: CredentialProgram[] }>({
    query: PROGRAMS_QUERY,
  });
  const [enrollmentsResult] = useQuery<{
    myProgramEnrollments: ProgramEnrollment[];
  }>({
    query: MY_PROGRAM_ENROLLMENTS_QUERY,
  });
  const [, enrollMutation] = useMutation(ENROLL_IN_PROGRAM_MUTATION);

  const programs = programsResult.data?.programs ?? [];
  const enrollments = enrollmentsResult.data?.myProgramEnrollments ?? [];
  const enrollmentMap = new Map(enrollments.map((e) => [e.programId, e]));

  const handleEnroll = async (programId: string): Promise<void> => {
    await enrollMutation({ programId });
    navigate(`/programs/${programId}`);
  };

  if (programsResult.fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (programsResult.error) {
    return (
      <div className="p-6 text-destructive">
        Failed to load programs: {programsResult.error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nanodegree Programs</h1>
        <p className="text-muted-foreground mt-2">
          Complete all courses in a program to earn a stackable credential.
        </p>
      </div>

      {programs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No programs available yet.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => {
            const enrollment = enrollmentMap.get(program.id);
            const isEnrolled = Boolean(enrollment);
            const isCompleted = Boolean(enrollment?.completedAt);

            return (
              <Card
                key={program.id}
                className="flex flex-col hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-4xl">{program.badgeEmoji}</span>
                    {isCompleted ? (
                      <Badge variant="default" className="bg-green-500">
                        Completed
                      </Badge>
                    ) : isEnrolled ? (
                      <Badge variant="secondary">Enrolled</Badge>
                    ) : null}
                  </div>
                  <CardTitle className="text-lg mt-2">
                    {program.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {program.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col gap-4 mt-auto">
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{program.requiredCourseIds.length} courses</span>
                    <span>{program.totalHours}h total</span>
                    <span>{program.enrollmentCount} enrolled</span>
                  </div>

                  {isEnrolled && !isCompleted && (
                    <Progress
                      value={0}
                      className="h-2"
                      aria-label="Program progress"
                    />
                  )}

                  <div className="flex gap-2">
                    {isEnrolled ? (
                      <Button
                        className="flex-1"
                        onClick={() => navigate(`/programs/${program.id}`)}
                      >
                        {isCompleted ? 'View Certificate' : 'Continue'}
                      </Button>
                    ) : (
                      <Button
                        className="flex-1"
                        variant="outline"
                        onClick={() => handleEnroll(program.id)}
                      >
                        Enroll
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/programs/${program.id}`)}
                    >
                      Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
