import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from 'graphql-request';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LIBRARY_COURSES_QUERY,
  ACTIVATE_LIBRARY_COURSE_MUTATION,
} from '@/lib/graphql/library.queries';

const GRAPHQL_URL =
  (import.meta.env['VITE_GRAPHQL_URL'] as string | undefined) ?? '/graphql';

type LibraryTopic =
  | 'ALL'
  | 'GDPR'
  | 'SOC2'
  | 'HIPAA'
  | 'AML'
  | 'DEI'
  | 'CYBERSECURITY';

interface LibraryCourse {
  id: string;
  title: string;
  description: string;
  topic: string;
  licenseType: string;
  priceCents: number;
  durationMinutes: number;
  isActivated: boolean;
}

const TOPIC_COLORS: Record<string, string> = {
  GDPR: 'bg-blue-100 text-blue-800',
  SOC2: 'bg-purple-100 text-purple-800',
  HIPAA: 'bg-green-100 text-green-800',
  AML: 'bg-yellow-100 text-yellow-800',
  DEI: 'bg-pink-100 text-pink-800',
  CYBERSECURITY: 'bg-red-100 text-red-800',
  HARASSMENT_PREVENTION: 'bg-orange-100 text-orange-800',
};

const TABS: { value: LibraryTopic | 'HARASSMENT_PREVENTION'; label: string }[] =
  [
    { value: 'ALL', label: 'All' },
    { value: 'GDPR', label: 'GDPR' },
    { value: 'SOC2', label: 'SOC 2' },
    { value: 'HIPAA', label: 'HIPAA' },
    { value: 'AML', label: 'AML' },
    { value: 'DEI', label: 'DEI' },
    { value: 'CYBERSECURITY', label: 'Cybersecurity' },
  ];

export function CourseLibraryPage() {
  const queryClient = useQueryClient();
  const [activeTopic, setActiveTopic] = useState<string>('ALL');
  const [confirmCourse, setConfirmCourse] = useState<LibraryCourse | null>(
    null
  );

  const { data, isLoading, error } = useQuery<{
    libraryCourses: LibraryCourse[];
  }>({
    queryKey: ['library-courses', activeTopic],
    queryFn: () =>
      request(GRAPHQL_URL, LIBRARY_COURSES_QUERY, {
        topic: activeTopic === 'ALL' ? undefined : activeTopic,
      }),
  });

  const { mutate: activate, isPending } = useMutation({
    mutationFn: (libraryCourseId: string) =>
      request(GRAPHQL_URL, ACTIVATE_LIBRARY_COURSE_MUTATION, {
        libraryCourseId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['library-courses'] });
      setConfirmCourse(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        Failed to load compliance course library.
      </div>
    );
  }

  const courses = data?.libraryCourses ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-1">Compliance Course Library</h1>
      <p className="text-muted-foreground mb-6">
        Activate pre-built compliance courses to add them to your catalog
        instantly.
      </p>

      <Tabs value={activeTopic} onValueChange={setActiveTopic} className="mb-6">
        <TabsList className="flex-wrap h-auto gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {courses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No courses available for this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TOPIC_COLORS[course.topic] ?? 'bg-gray-100 text-gray-800'}`}
                  >
                    {course.topic.replace('_', ' ')}
                  </span>
                  {course.licenseType === 'FREE' && (
                    <Badge variant="secondary" className="text-xs">
                      FREE
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base leading-tight">
                  {course.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 text-sm text-muted-foreground">
                <p className="line-clamp-3">{course.description}</p>
                <p className="mt-3 text-xs font-medium">
                  {course.durationMinutes} min
                </p>
              </CardContent>
              <CardFooter>
                {course.isActivated ? (
                  <Badge
                    variant="outline"
                    className="w-full justify-center py-2 text-green-700 border-green-300"
                  >
                    Activated
                  </Badge>
                ) : (
                  <Button
                    className="w-full"
                    variant="default"
                    onClick={() => setConfirmCourse(course)}
                  >
                    Activate
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={confirmCourse !== null}
        onOpenChange={() => setConfirmCourse(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Course</DialogTitle>
            <DialogDescription>
              This will add <strong>{confirmCourse?.title}</strong> to your
              tenant catalog. Learners will be able to enroll once you publish
              it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCourse(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmCourse && activate(confirmCourse.id)}
              disabled={isPending}
            >
              {isPending ? 'Activating...' : 'Confirm Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
