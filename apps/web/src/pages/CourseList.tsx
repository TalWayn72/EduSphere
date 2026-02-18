import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Users } from 'lucide-react';

// Mock course data with content mapping
const MOCK_COURSES = [
  {
    id: 'course-1',
    title: 'Introduction to Talmud Study',
    description:
      'Learn the fundamentals of Talmudic reasoning and argumentation',
    instructor: 'Rabbi David Cohen',
    duration: '8 weeks',
    students: 45,
    defaultContentId: 'content-1',
    thumbnail: '📚',
  },
  {
    id: 'course-2',
    title: 'Advanced Chavruta Techniques',
    description:
      'Master the art of collaborative Talmud learning with AI assistance',
    instructor: 'Dr. Sarah Levine',
    duration: '6 weeks',
    students: 32,
    defaultContentId: 'content-3',
    thumbnail: '🤝',
  },
  {
    id: 'course-3',
    title: 'Knowledge Graph Navigation',
    description:
      'Explore interconnected concepts in Jewish texts using graph-based learning',
    instructor: 'Prof. Michael Stein',
    duration: '4 weeks',
    students: 28,
    defaultContentId: 'content-2',
    thumbnail: '🕸️',
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
  },
  {
    id: 'course-5',
    title: 'Ethics in Jewish Thought',
    description:
      'Explore ethical frameworks from classical to modern Jewish philosophy',
    instructor: 'Dr. Aaron Bernstein',
    duration: '6 weeks',
    students: 41,
    defaultContentId: 'content-2',
    thumbnail: '⚖️',
  },
  {
    id: 'course-6',
    title: 'AI-Enhanced Torah Study',
    description:
      'Leverage AI agents for deeper understanding of traditional texts',
    instructor: 'Rabbi Tech Innovation Team',
    duration: '5 weeks',
    students: 52,
    defaultContentId: 'content-1',
    thumbnail: '🤖',
  },
];

export function CourseList() {
  const navigate = useNavigate();

  const handleCourseClick = (contentId: string) => {
    navigate(`/learn/${contentId}`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground">
            Explore our collection of courses and start your learning journey
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {MOCK_COURSES.map((course) => (
            <Card
              key={course.id}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => handleCourseClick(course.defaultContentId)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="text-4xl">{course.thumbnail}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCourseClick(course.defaultContentId);
                    }}
                  >
                    Start Learning
                  </Button>
                </div>
                <CardTitle className="text-xl">{course.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {course.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>{course.instructor}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{course.students} students</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
