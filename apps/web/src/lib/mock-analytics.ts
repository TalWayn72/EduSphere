/**
 * Mock analytics data for Dashboard.
 * EXCEPTION NOTE (150-line rule): Interfaces and their corresponding mock constants
 * are tightly coupled (DailyActivity↔MOCK_HEATMAP_DATA, CourseProgress↔MOCK_COURSE_PROGRESS,
 * etc.). Splitting them across files would hurt discoverability without meaningful benefit.
 */
export interface DailyActivity {
  date: string; // ISO date string
  count: number; // 0-10 study sessions
}

export interface CourseProgress {
  id: string;
  title: string;
  progress: number; // 0-100
  lastStudied: string;
  totalMinutes: number;
}

export interface WeeklyStats {
  week: string;
  studyMinutes: number;
  quizzesTaken: number;
  annotationsAdded: number;
  aiSessions: number;
}

export interface ActivityItem {
  id: string;
  type: 'study' | 'quiz' | 'annotation' | 'ai_session' | 'discussion';
  title: string;
  description: string;
  timestamp: string;
  courseTitle?: string;
}

// Generate last 84 days of activity (12 weeks)
function generateHeatmapData(): DailyActivity[] {
  const days: DailyActivity[] = [];
  const now = new Date();
  for (let i = 83; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    // Weekdays have more activity
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseActivity = isWeekend ? 2 : 5;
    const randomActivity =
      Math.random() > 0.3
        ? Math.floor(Math.random() * baseActivity + (isWeekend ? 0 : 1))
        : 0;
    days.push({
      date: date.toISOString().split('T')[0] ?? '',
      count: randomActivity,
    });
  }
  return days;
}

export const MOCK_HEATMAP_DATA: DailyActivity[] = generateHeatmapData();

export const MOCK_COURSE_PROGRESS: CourseProgress[] = [
  {
    id: '1',
    title: 'Introduction to Talmud Study',
    progress: 72,
    lastStudied: '2h ago',
    totalMinutes: 432,
  },
  {
    id: '2',
    title: 'Advanced Chavruta Techniques',
    progress: 45,
    lastStudied: '1d ago',
    totalMinutes: 270,
  },
  {
    id: '3',
    title: 'Knowledge Graph Navigation',
    progress: 28,
    lastStudied: '3d ago',
    totalMinutes: 168,
  },
];

export const MOCK_WEEKLY_STATS: WeeklyStats[] = [
  {
    week: 'Week 1',
    studyMinutes: 180,
    quizzesTaken: 4,
    annotationsAdded: 12,
    aiSessions: 6,
  },
  {
    week: 'Week 2',
    studyMinutes: 240,
    quizzesTaken: 6,
    annotationsAdded: 18,
    aiSessions: 8,
  },
  {
    week: 'Week 3',
    studyMinutes: 120,
    quizzesTaken: 2,
    annotationsAdded: 8,
    aiSessions: 3,
  },
  {
    week: 'Week 4',
    studyMinutes: 300,
    quizzesTaken: 8,
    annotationsAdded: 24,
    aiSessions: 12,
  },
];

export const MOCK_ACTIVITY_FEED: ActivityItem[] = [
  {
    id: '1',
    type: 'study',
    title: 'Completed Study Session',
    description: 'Studied Tractate Bava Metzia for 45 minutes',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    courseTitle: 'Introduction to Talmud Study',
  },
  {
    id: '2',
    type: 'quiz',
    title: 'Quiz Completed',
    description: 'Scored 85% on Concepts of Damages quiz',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    courseTitle: 'Introduction to Talmud Study',
  },
  {
    id: '3',
    type: 'ai_session',
    title: 'AI Tutor Session',
    description: 'Explored concepts with Chavruta AI agent',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    courseTitle: 'Advanced Chavruta Techniques',
  },
  {
    id: '4',
    type: 'annotation',
    title: 'Annotation Added',
    description: 'Added 3 highlights and 1 note to Chapter 4',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    courseTitle: 'Knowledge Graph Navigation',
  },
  {
    id: '5',
    type: 'discussion',
    title: 'Discussion Joined',
    description: 'Joined discussion on property law principles',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    courseTitle: 'Introduction to Talmud Study',
  },
];

export const MOCK_LEARNING_STREAK = 7; // days
export const MOCK_TOTAL_STUDY_MINUTES = 870;
export const MOCK_CONCEPTS_MASTERED = 34;

// Aggregate stats object used by Dashboard until myStats resolver is implemented.
export const MOCK_STATS = {
  coursesEnrolled: 3,
  activeCourses: 3,
  completedCourses: 1,
  annotationsCreated: 43,
  conceptsMastered: MOCK_CONCEPTS_MASTERED,
  totalLearningMinutes: MOCK_TOTAL_STUDY_MINUTES,
  weeklyActivity: MOCK_HEATMAP_DATA,
};
