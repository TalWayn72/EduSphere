import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Users, Plus, Globe, EyeOff, CheckCircle2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import type { CourseFormData } from './course-create.types';

const INSTRUCTOR_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR']);

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  students: number;
  defaultContentId: string;
  thumbnail: string;
  published: boolean;
}

const BASE_COURSES: Course[] = [
  {
    id: 'course-1',
    title: 'Introduction to Talmud Study',
    description: 'Learn the fundamentals of Talmudic reasoning and argumentation',
    instructor: 'Rabbi David Cohen',
    duration: '8 weeks',
    students: 45,
    defaultContentId: 'content-1',
    thumbnail: '📚',
    published: true,
  },
  {
    id: 'course-2',
    title: 'Advanced Chavruta Techniques',
    description: 'Master the art of collaborative Talmud learning with AI assistance',
    instructor: 'Dr. Sarah Levine',
    duration: '6 weeks',
    students: 32,
    defaultContentId: 'content-3',
    thumbnail: '🤝',
    published: true,
  },
  {
    id: 'course-3',
    title: 'Knowledge Graph Navigation',
    description: 'Explore interconnected concepts in Jewish texts using graph-based learning',
    instructor: 'Prof. Michael Stein',
    duration: '4 weeks',
    students: 28,
    defaultContentId: 'content-2',
    thumbnail: '🕸️',
    published: true,
  },
  {
    id: 'course-4',
    title: 'Maimonidean Philosophy',
    description: 'Deep dive into the Guide for the Perplexed and other works',
    instructor: 'Rabbi Rachel Goldberg',
    duration: '10 weeks',
    students: 38,
    defaultContentId: 'content-1',
    thumbnail: '🔍',
    published: true,
  },
  {
    id: 'course-5',
    title: 'Ethics in Jewish Thought',
    description: 'Explore ethical frameworks from classical to modern Jewish philosophy',
    instructor: 'Dr. Aaron Bernstein',
    duration: '6 weeks',
    students: 41,
    defaultContentId: 'content-2',
    thumbnail: '⚖️',
    published: true,
  },
  {
    id: 'course-6',
    title: 'AI-Enhanced Torah Study',
    description: 'Leverage AI agents for deeper understanding of traditional texts',
    instructor: 'Rabbi Tech Innovation Team',
    duration: '5 weeks',
    students: 52,
    defaultContentId: 'content-1',
    thumbnail: '🤖',
    published: true,
  },
];

function courseFromFormData(data: CourseFormData): Course {
  return {
    id: `course-new-${Date.now()}`,
    title: data.title,
    description: data.description,
    instructor: 'You',
    duration: data.duration || '—',
    students: 0,
    defaultContentId: 'content-1',
    thumbnail: data.thumbnail,
    published: data.published,
  };
}

export function CourseList() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const [courses, setCourses] = useState<Course[]>(BASE_COURSES);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const isInstructor = user ? INSTRUCTOR_ROLES.has(user.role) : false;

  // Receive newly created course from CourseCreatePage
  useEffect(() => {
    const state = location.state as { newCourse?: CourseFormData; message?: string } | null;
    if (state?.newCourse) {
      setCourses((prev) => [courseFromFormData(state.newCourse!), ...prev]);
      if (state.message) showToast(state.message);
      // Clear state so refresh doesn't re-add
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleEnroll = (e: React.MouseEvent, courseId: string, title: string) => {
    e.stopPropagation();
    setEnrolled((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
        showToast(`Unenrolled from "${title}"`);
      } else {
        next.add(courseId);
        showToast(`Enrolled in "${title}"!`);
      }
      return next;
    });
  };

  const togglePublish = (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, published: !c.published } : c))
    );
  };

  return (
    <Layout>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg text-sm animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {toast}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
            <p className="text-muted-foreground">
              Explore our collection of courses and start your learning journey
            </p>
          </div>
          {isInstructor && (
            <Button onClick={() => navigate('/courses/new')} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              New Course
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="hover:shadow-lg transition-shadow cursor-pointer group relative"
              onClick={() => navigate(`/learn/${course.defaultContentId}`)}
            >
              {/* Draft badge for instructors */}
              {isInstructor && !course.published && (
                <div className="absolute top-3 right-3 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                  Draft
                </div>
              )}

              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="text-4xl">{course.thumbnail}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/learn/${course.defaultContentId}`);
                    }}
                  >
                    Open
                  </Button>
                </div>
                <CardTitle className="text-xl leading-snug">{course.title}</CardTitle>
                <CardDescription className="line-clamp-2">{course.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span className="truncate">{course.instructor}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {course.duration !== '—' && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{course.duration}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{course.students} students</span>
                    </div>
                  </div>

                  {/* Enroll button — students only */}
                  {!isInstructor && (
                    <Button
                      variant={enrolled.has(course.id) ? 'secondary' : 'default'}
                      size="sm"
                      className="w-full mt-1 gap-1.5"
                      onClick={(e) => handleEnroll(e, course.id, course.title)}
                    >
                      {enrolled.has(course.id) ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Enrolled
                        </>
                      ) : (
                        'Enroll'
                      )}
                    </Button>
                  )}

                  {/* Publish toggle — instructors only */}
                  {isInstructor && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-1 gap-1.5"
                      onClick={(e) => togglePublish(e, course.id)}
                    >
                      {course.published ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Globe className="h-3.5 w-3.5" />
                          Publish
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
