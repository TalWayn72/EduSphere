/**
 * Shared Deterministic Data Fixtures — Chart Visual Regression Tests
 *
 * Provides stable mock GraphQL responses for analytics, assessment, and gamification
 * chart pages. All data is deterministic to ensure consistent screenshot baselines.
 *
 * Usage:
 *   import { MOCK_ANALYTICS_DATA, setupGraphQLMock } from './visual-charts-fixtures';
 *   await setupGraphQLMock(page, { courseAnalytics: MOCK_ANALYTICS_DATA });
 */

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_ANALYTICS_DATA = {
  data: {
    courseAnalytics: {
      enrollments: [
        { date: '2025-01-01', count: 100 },
        { date: '2025-02-01', count: 150 },
        { date: '2025-03-01', count: 200 },
        { date: '2025-04-01', count: 175 },
        { date: '2025-05-01', count: 225 },
        { date: '2025-06-01', count: 280 },
      ],
      completionRate: 0.75,
      averageScore: 82,
      activeStudents: 1240,
      totalCourses: 48,
    },
  },
};

export const MOCK_TENANT_ANALYTICS_DATA = {
  data: {
    tenantAnalytics: {
      tenants: [
        {
          id: 'tenant-1',
          name: 'Acme University',
          users: 450,
          courses: 12,
          activeRate: 0.82,
        },
        {
          id: 'tenant-2',
          name: 'Beta College',
          users: 320,
          courses: 8,
          activeRate: 0.71,
        },
        {
          id: 'tenant-3',
          name: 'Gamma Institute',
          users: 580,
          courses: 15,
          activeRate: 0.88,
        },
      ],
      totalUsers: 1350,
      totalTenants: 3,
      averageActiveRate: 0.8,
      usageOverTime: [
        { date: '2025-01-01', sessions: 2400 },
        { date: '2025-02-01', sessions: 2800 },
        { date: '2025-03-01', sessions: 3100 },
        { date: '2025-04-01', sessions: 2900 },
        { date: '2025-05-01', sessions: 3400 },
        { date: '2025-06-01', sessions: 3800 },
      ],
    },
  },
};

export const MOCK_ROI_ANALYTICS_DATA = {
  data: {
    roiAnalytics: {
      totalInvestment: 125000,
      totalReturn: 340000,
      roiPercentage: 172,
      costPerStudent: 45.2,
      revenuePerStudent: 122.8,
      breakdowns: [
        { category: 'Infrastructure', cost: 35000, return: 90000 },
        { category: 'Content Creation', cost: 45000, return: 120000 },
        { category: 'Instructor Hours', cost: 30000, return: 85000 },
        { category: 'Platform License', cost: 15000, return: 45000 },
      ],
      monthlyROI: [
        { month: '2025-01', roi: 120 },
        { month: '2025-02', roi: 135 },
        { month: '2025-03', roi: 155 },
        { month: '2025-04', roi: 160 },
        { month: '2025-05', roi: 168 },
        { month: '2025-06', roi: 172 },
      ],
    },
  },
};

export const MOCK_PLATFORM_ANALYTICS_DATA = {
  data: {
    platformAnalytics: {
      activeUsers: [
        { date: '2025-01-01', daily: 340, weekly: 890, monthly: 1240 },
        { date: '2025-02-01', daily: 380, weekly: 950, monthly: 1350 },
        { date: '2025-03-01', daily: 420, weekly: 1020, monthly: 1480 },
        { date: '2025-04-01', daily: 390, weekly: 980, monthly: 1400 },
        { date: '2025-05-01', daily: 450, weekly: 1100, monthly: 1550 },
        { date: '2025-06-01', daily: 510, weekly: 1200, monthly: 1680 },
      ],
      systemHealth: {
        uptime: 99.95,
        avgResponseTime: 142,
        errorRate: 0.003,
        storageUsed: 78.5,
      },
      featureAdoption: [
        { feature: 'Knowledge Graph', adoption: 0.65 },
        { feature: 'AI Tutor', adoption: 0.52 },
        { feature: 'Peer Review', adoption: 0.78 },
        { feature: 'Gamification', adoption: 0.85 },
        { feature: 'Annotations', adoption: 0.71 },
      ],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ASSESSMENT FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_ASSESSMENT_DATA = {
  data: {
    assessments: {
      items: [
        {
          id: 'a-1',
          title: 'Midterm Evaluation',
          type: 'EXAM',
          status: 'ACTIVE',
          averageScore: 78,
          submissions: 120,
        },
        {
          id: 'a-2',
          title: 'Project Review',
          type: 'PROJECT',
          status: 'ACTIVE',
          averageScore: 85,
          submissions: 95,
        },
        {
          id: 'a-3',
          title: 'Peer Assessment Q2',
          type: 'PEER',
          status: 'COMPLETED',
          averageScore: 82,
          submissions: 110,
        },
        {
          id: 'a-4',
          title: 'Final Capstone',
          type: 'CAPSTONE',
          status: 'DRAFT',
          averageScore: 0,
          submissions: 0,
        },
      ],
      totalCount: 4,
    },
  },
};

export const MOCK_360_ASSESSMENT_DATA = {
  data: {
    assessment360: {
      dimensions: [
        {
          name: 'Communication',
          selfScore: 4.2,
          peerScore: 3.8,
          managerScore: 4.0,
        },
        {
          name: 'Leadership',
          selfScore: 3.5,
          peerScore: 3.9,
          managerScore: 3.7,
        },
        {
          name: 'Technical Skills',
          selfScore: 4.5,
          peerScore: 4.3,
          managerScore: 4.4,
        },
        { name: 'Teamwork', selfScore: 4.0, peerScore: 4.2, managerScore: 4.1 },
        {
          name: 'Problem Solving',
          selfScore: 3.8,
          peerScore: 4.0,
          managerScore: 3.9,
        },
        {
          name: 'Time Management',
          selfScore: 3.6,
          peerScore: 3.4,
          managerScore: 3.5,
        },
      ],
      evaluators: [
        {
          id: 'e-1',
          name: 'Dr. Sarah Cohen',
          role: 'Manager',
          status: 'COMPLETED',
        },
        {
          id: 'e-2',
          name: 'Prof. David Levi',
          role: 'Peer',
          status: 'COMPLETED',
        },
        { id: 'e-3', name: 'Dr. Maya Rosen', role: 'Peer', status: 'PENDING' },
      ],
      overallScore: 3.92,
    },
  },
};

export const MOCK_ASSESSMENT_RESULTS_DATA = {
  data: {
    assessmentResults: {
      scoreDistribution: [
        { range: '0-20', count: 5 },
        { range: '21-40', count: 12 },
        { range: '41-60', count: 28 },
        { range: '61-80', count: 45 },
        { range: '81-100', count: 30 },
      ],
      averageScore: 72.4,
      medianScore: 75,
      passRate: 0.86,
      topPerformers: [
        { name: 'Student A', score: 98 },
        { name: 'Student B', score: 96 },
        { name: 'Student C', score: 95 },
      ],
    },
  },
};

export const MOCK_EXAM_RESULTS_DATA = {
  data: {
    examResults: {
      scores: [
        {
          studentId: 's-1',
          name: 'Alice Cohen',
          score: 92,
          grade: 'A',
          submittedAt: '2025-06-01T10:00:00Z',
        },
        {
          studentId: 's-2',
          name: 'Bob Levi',
          score: 78,
          grade: 'B+',
          submittedAt: '2025-06-01T10:30:00Z',
        },
        {
          studentId: 's-3',
          name: 'Carol Dayan',
          score: 85,
          grade: 'A-',
          submittedAt: '2025-06-01T09:45:00Z',
        },
        {
          studentId: 's-4',
          name: 'Dan Shapira',
          score: 65,
          grade: 'B-',
          submittedAt: '2025-06-01T11:00:00Z',
        },
        {
          studentId: 's-5',
          name: 'Eva Mizrachi',
          score: 88,
          grade: 'A-',
          submittedAt: '2025-06-01T10:15:00Z',
        },
      ],
      classAverage: 81.6,
      highestScore: 92,
      lowestScore: 65,
      questionAnalysis: [
        { questionId: 'q-1', topic: 'Graph Theory', correctRate: 0.85 },
        { questionId: 'q-2', topic: 'SQL Queries', correctRate: 0.72 },
        { questionId: 'q-3', topic: 'Normalization', correctRate: 0.68 },
        { questionId: 'q-4', topic: 'Concurrency', correctRate: 0.55 },
        { questionId: 'q-5', topic: 'Indexing', correctRate: 0.9 },
      ],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GAMIFICATION FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_GAMIFICATION_DATA = {
  data: {
    gamification: {
      xp: {
        current: 2450,
        nextLevelAt: 3000,
        level: 12,
        rank: 'Scholar',
        history: [
          { date: '2025-06-01', gained: 120, source: 'Quiz Completion' },
          { date: '2025-06-02', gained: 80, source: 'Discussion Post' },
          { date: '2025-06-03', gained: 200, source: 'Assignment Submit' },
          { date: '2025-06-04', gained: 50, source: 'Daily Login' },
          { date: '2025-06-05', gained: 150, source: 'Peer Review' },
        ],
      },
      streak: {
        current: 7,
        longest: 21,
        lastActive: '2025-06-05',
      },
      badges: [
        {
          id: 'b-1',
          name: 'First Steps',
          icon: 'rocket',
          earned: true,
          earnedAt: '2025-01-15',
        },
        {
          id: 'b-2',
          name: 'Knowledge Seeker',
          icon: 'book',
          earned: true,
          earnedAt: '2025-02-20',
        },
        {
          id: 'b-3',
          name: 'Collaborator',
          icon: 'users',
          earned: true,
          earnedAt: '2025-03-10',
        },
        {
          id: 'b-4',
          name: 'Top Scorer',
          icon: 'trophy',
          earned: false,
          earnedAt: null,
        },
        {
          id: 'b-5',
          name: 'Mentor',
          icon: 'heart',
          earned: false,
          earnedAt: null,
        },
        {
          id: 'b-6',
          name: 'Marathon Runner',
          icon: 'flame',
          earned: true,
          earnedAt: '2025-04-05',
        },
      ],
    },
  },
};

export const MOCK_LEADERBOARD_DATA = {
  data: {
    leaderboard: {
      entries: [
        {
          rank: 1,
          userId: 'u-1',
          name: 'Alice Cohen',
          xp: 5200,
          level: 18,
          badges: 12,
        },
        {
          rank: 2,
          userId: 'u-2',
          name: 'Bob Levi',
          xp: 4800,
          level: 17,
          badges: 10,
        },
        {
          rank: 3,
          userId: 'u-3',
          name: 'Carol Dayan',
          xp: 4350,
          level: 16,
          badges: 11,
        },
        {
          rank: 4,
          userId: 'u-4',
          name: 'Dan Shapira',
          xp: 3900,
          level: 15,
          badges: 8,
        },
        {
          rank: 5,
          userId: 'u-5',
          name: 'Eva Mizrachi',
          xp: 3600,
          level: 14,
          badges: 9,
        },
        {
          rank: 6,
          userId: 'u-6',
          name: 'Fadi Hassan',
          xp: 3200,
          level: 13,
          badges: 7,
        },
        {
          rank: 7,
          userId: 'u-7',
          name: 'Gal Peretz',
          xp: 2900,
          level: 12,
          badges: 6,
        },
        {
          rank: 8,
          userId: 'u-8',
          name: 'Hana Stern',
          xp: 2650,
          level: 11,
          badges: 8,
        },
        {
          rank: 9,
          userId: 'u-9',
          name: 'Idan Katz',
          xp: 2450,
          level: 10,
          badges: 5,
        },
        {
          rank: 10,
          userId: 'u-10',
          name: 'Julia Friedman',
          xp: 2200,
          level: 10,
          badges: 6,
        },
      ],
      totalParticipants: 245,
      currentUserRank: 9,
    },
  },
};

export const MOCK_CHALLENGES_DATA = {
  data: {
    challenges: {
      active: [
        {
          id: 'c-1',
          title: 'Weekly Quiz Champion',
          description: 'Score 90+ on 3 quizzes',
          progress: 2,
          target: 3,
          xpReward: 500,
          endsAt: '2025-06-10',
        },
        {
          id: 'c-2',
          title: 'Study Streak',
          description: 'Login for 7 consecutive days',
          progress: 5,
          target: 7,
          xpReward: 300,
          endsAt: '2025-06-12',
        },
        {
          id: 'c-3',
          title: 'Peer Helper',
          description: 'Review 5 peer assignments',
          progress: 1,
          target: 5,
          xpReward: 400,
          endsAt: '2025-06-15',
        },
      ],
      completed: [
        {
          id: 'c-4',
          title: 'First Assignment',
          xpEarned: 200,
          completedAt: '2025-05-20',
        },
        {
          id: 'c-5',
          title: 'Discussion Starter',
          xpEarned: 150,
          completedAt: '2025-05-25',
        },
      ],
    },
  },
};

export const MOCK_CERTIFICATES_DATA = {
  data: {
    certificates: {
      items: [
        {
          id: 'cert-1',
          courseTitle: 'Introduction to Data Science',
          issuedAt: '2025-03-15',
          grade: 'A',
          credentialId: 'CRED-2025-001',
        },
        {
          id: 'cert-2',
          courseTitle: 'Advanced Machine Learning',
          issuedAt: '2025-05-01',
          grade: 'A-',
          credentialId: 'CRED-2025-002',
        },
        {
          id: 'cert-3',
          courseTitle: 'Graph Databases Fundamentals',
          issuedAt: '2025-06-01',
          grade: 'B+',
          credentialId: 'CRED-2025-003',
        },
      ],
      totalCertificates: 3,
    },
  },
};

export const MOCK_PROFILE_PROGRESS_DATA = {
  data: {
    profileProgress: {
      coursesCompleted: 8,
      coursesInProgress: 3,
      totalHoursLearned: 142,
      progressOverTime: [
        { month: '2025-01', hours: 18, courses: 1 },
        { month: '2025-02', hours: 22, courses: 1 },
        { month: '2025-03', hours: 25, courses: 2 },
        { month: '2025-04', hours: 20, courses: 1 },
        { month: '2025-05', hours: 28, courses: 2 },
        { month: '2025-06', hours: 29, courses: 1 },
      ],
      skillLevels: [
        { skill: 'Data Science', level: 4, maxLevel: 5 },
        { skill: 'Machine Learning', level: 3, maxLevel: 5 },
        { skill: 'Graph Theory', level: 3, maxLevel: 5 },
        { skill: 'SQL', level: 5, maxLevel: 5 },
        { skill: 'Statistics', level: 4, maxLevel: 5 },
      ],
    },
  },
};
