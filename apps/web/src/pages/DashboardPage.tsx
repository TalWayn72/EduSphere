import { useQuery } from 'urql';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, BookOpen, CheckCircle, Zap, Clock, ChevronRight } from 'lucide-react';
import { getCurrentUser, DEV_MODE } from '@/lib/auth';
import { Layout } from '@/components/Layout';
import { MasteryBadge } from '@/components/ui/MasteryBadge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MY_ENROLLMENTS_QUERY } from '@/lib/graphql/content.queries';
// TODO: replace MOCK_STREAK, MOCK_XP, MOCK_ACTIVITY with real queries once
//       myStats and activityFeed resolvers are in the deployed supergraph.

// ── Mock data ──────────────────────────────────────────────────────────────────

interface MockCourse {
  id: string;
  title: string;
  progress: number;
  lastStudied: string;
  instructor: string;
}

interface MockActivity {
  id: string;
  icon: string;
  action: string;
  timeAgo: string;
}

interface MockMasteryItem {
  topic: string;
  level: 'none' | 'attempted' | 'familiar' | 'proficient' | 'mastered';
}

const MOCK_IN_PROGRESS: MockCourse[] = [
  {
    id: 'c-1',
    title: 'Introduction to Talmud Study',
    progress: 72,
    lastStudied: '2 hours ago',
    instructor: 'Dr. Cohen',
  },
  {
    id: 'c-2',
    title: 'Advanced Chavruta Techniques',
    progress: 45,
    lastStudied: '1 day ago',
    instructor: 'Prof. Levi',
  },
  {
    id: 'c-3',
    title: 'Knowledge Graph Navigation',
    progress: 28,
    lastStudied: '3 days ago',
    instructor: 'Dr. Ben-David',
  },
];

const MOCK_RECOMMENDED: MockCourse[] = [
  {
    id: 'c-4',
    title: 'Mishnah: Laws of Damages',
    progress: 0,
    lastStudied: 'Not started',
    instructor: 'Dr. Shapiro',
  },
  {
    id: 'c-5',
    title: 'Biblical Hebrew Foundations',
    progress: 0,
    lastStudied: 'Not started',
    instructor: 'Prof. Goldberg',
  },
];

const MOCK_ACTIVITY: MockActivity[] = [
  { id: 'a-1', icon: 'study', action: 'Completed study session in Tractate Bava Metzia', timeAgo: '2h ago' },
  { id: 'a-2', icon: 'quiz', action: 'Scored 85% on Concepts of Damages quiz', timeAgo: '5h ago' },
  { id: 'a-3', icon: 'ai', action: 'AI Tutor session — explored Chavruta concepts', timeAgo: '1d ago' },
  { id: 'a-4', icon: 'annotation', action: 'Added 3 highlights to Chapter 4', timeAgo: '2d ago' },
  { id: 'a-5', icon: 'course', action: 'Enrolled in Knowledge Graph Navigation', timeAgo: '3d ago' },
];

const MOCK_MASTERY: MockMasteryItem[] = [
  { topic: 'Talmudic Reasoning', level: 'mastered' },
  { topic: 'Chavruta Study', level: 'proficient' },
  { topic: 'Knowledge Graphs', level: 'familiar' },
  { topic: 'Hebrew Grammar', level: 'attempted' },
  { topic: 'Halacha Overview', level: 'none' },
];

const MOCK_STREAK = 7;
const MOCK_XP = 2_340;
const MOCK_COMPLETED = 4;

// ── Sub-components ─────────────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: string }) {
  const base = 'h-7 w-7 rounded-full flex items-center justify-center text-xs shrink-0';
  const map: Record<string, string> = {
    study: 'bg-primary/10 text-primary',
    quiz: 'bg-success/10 text-success',
    ai: 'bg-accent/10 text-accent',
    annotation: 'bg-warning/10 text-warning',
    course: 'bg-info/10 text-info',
  };
  const labels: Record<string, string> = {
    study: 'S', quiz: 'Q', ai: 'AI', annotation: 'A', course: 'C',
  };
  return (
    <div className={`${base} ${map[type] ?? map['study']}`} aria-hidden>
      {labels[type] ?? 'S'}
    </div>
  );
}

interface CourseCardProps {
  course: MockCourse;
}

function CourseCard({ course }: CourseCardProps) {
  return (
    <Link
      to={`/courses/${course.id}`}
      className="block rounded-xl border border-border bg-card p-4 hover:bg-card-hover transition-colors card-interactive shrink-0 w-64"
      aria-label={`Continue ${course.title}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
        <span className="text-xs text-muted-foreground">{course.lastStudied}</span>
      </div>
      <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-2">{course.title}</h3>
      <p className="text-xs text-muted-foreground mb-3">{course.instructor}</p>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{course.progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${course.progress}%` }}
            role="progressbar"
            aria-valuenow={course.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    </Link>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DashboardPage() {
  const user = getCurrentUser();
  const displayName = user?.firstName ?? (DEV_MODE ? 'Learner' : 'Learner');

  // Mounted guard: prevents urql cache dispatch during sibling render (BUG-052 pattern)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Real query: enrollments — falls back to MOCK_IN_PROGRESS when loading or errored
  const [enrollmentsResult] = useQuery({
    query: MY_ENROLLMENTS_QUERY,
    pause: !mounted,
  });

  // Derive counts from real data; fall back to mock lengths if query hasn't resolved
  const enrolledCount =
    enrollmentsResult.data?.myEnrollments?.length ?? MOCK_IN_PROGRESS.length;
  const completedCount =
    enrollmentsResult.data?.myEnrollments?.filter(
      (e: { status: string }) => e.status === 'COMPLETED'
    ).length ?? MOCK_COMPLETED;
  // TODO: replace MOCK_IN_PROGRESS with real in-progress enrollments once the
  //       myEnrollments resolver returns courseTitle + progress fields.
  const inProgressCourses = MOCK_IN_PROGRESS;
  const recommendedCourses = MOCK_RECOMMENDED;
  // TODO: replace MOCK_STREAK and MOCK_XP with real myStats query once resolver is live.
  const streak = MOCK_STREAK;
  const xp = MOCK_XP;
  // TODO: replace MOCK_ACTIVITY with real activityFeed query once resolver is live.
  const activity = MOCK_ACTIVITY;

  return (
    <Layout>
      <div className="space-y-8 max-w-screen-xl mx-auto">

        {/* Section 1 — Welcome Hero */}
        <section aria-labelledby="welcome-heading">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                id="welcome-heading"
                className="text-3xl font-bold tracking-tight"
                data-testid="welcome-heading"
              >
                Welcome back, {displayName}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">Here is what is happening in your learning journey.</p>
            </div>

            {/* Streak + Quick stats */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Streak widget */}
              <div
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5"
                data-testid="streak-widget"
              >
                <Flame className="h-5 w-5 streak-active" aria-hidden />
                <span className="text-sm font-semibold text-foreground">
                  {streak} day streak
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
                <BookOpen className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-sm font-medium text-foreground">
                  {enrolledCount} in progress
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
                <CheckCircle className="h-4 w-4 text-success" aria-hidden />
                <span className="text-sm font-medium text-foreground">
                  {completedCount} completed
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
                <Zap className="h-4 w-4 text-accent" aria-hidden />
                <span className="text-sm font-medium text-foreground">
                  {xp.toLocaleString()} XP
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Sections 2 + 3 — Continue Learning + Mastery Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Section 2 — Continue Learning (8 cols) */}
          <section
            aria-labelledby="continue-learning-heading"
            className="lg:col-span-8"
            data-testid="continue-learning-section"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle id="continue-learning-heading" className="text-base">
                  Continue Learning
                </CardTitle>
                <Link
                  to="/courses"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  See All
                  <ChevronRight className="h-3 w-3" aria-hidden />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
                  {inProgressCourses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 3 — Mastery Overview (4 cols) */}
          <section
            aria-labelledby="mastery-heading"
            className="lg:col-span-4"
            data-testid="mastery-overview"
          >
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle id="mastery-heading" className="text-base">
                  Mastery Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {MOCK_MASTERY.map(({ topic, level }) => (
                  <div key={topic} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-foreground truncate">{topic}</span>
                    <MasteryBadge level={level} size="sm" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Sections 4 + 5 — Recent Activity + Recommended */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Section 4 — Recent Activity (6 cols) */}
          <section
            aria-labelledby="recent-activity-heading"
            className="lg:col-span-6"
            data-testid="recent-activity"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle id="recent-activity-heading" className="text-base">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3" aria-label="Recent learning activities">
                  {activity.map((item) => (
                    <li key={item.id} className="flex items-start gap-3">
                      <ActivityIcon type={item.icon} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-tight">{item.action}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" aria-hidden />
                          {item.timeAgo}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </section>

          {/* Section 5 — Recommended (6 cols) */}
          <section
            aria-labelledby="recommendations-heading"
            className="lg:col-span-6"
            data-testid="recommendations"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle id="recommendations-heading" className="text-base">
                  Recommended for You
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendedCourses.map((course) => (
                  <Link
                    key={course.id}
                    to={`/courses/${course.id}`}
                    className="flex items-start gap-3 rounded-lg p-3 border border-border hover:bg-card-hover transition-colors"
                    aria-label={`Explore ${course.title}`}
                  >
                    <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{course.title}</p>
                      <p className="text-xs text-muted-foreground">{course.instructor}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 mt-0.5" aria-hidden />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </Layout>
  );
}
