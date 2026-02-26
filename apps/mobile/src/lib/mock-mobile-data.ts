// Mock data for DEV_MODE - mirrors web mock-analytics and mock-graph-data patterns
export const DEV_MODE = __DEV__;

export const MOCK_USER = {
  id: 'user-dev',
  email: 'student@edusphere.dev',
  firstName: 'Dev',
  lastName: 'Student',
  role: 'STUDENT',
};

export const MOCK_STATS = {
  activeCourses: 3,
  learningStreak: 14,
  studyTimeMinutes: 320,
  conceptsMastered: 47,
};

export const MOCK_RECENT_COURSES = [
  {
    id: 'course-1',
    title: 'Introduction to Philosophy',
    progress: 65,
    lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'course-2',
    title: 'Logic and Critical Thinking',
    progress: 30,
    lastAccessed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'course-3',
    title: 'Ethics and Moral Philosophy',
    progress: 10,
    lastAccessed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const MOCK_GRAPH_NODES = [
  {
    id: 'free-will',
    label: 'Free Will',
    type: 'CONCEPT' as const,
    connections: 4,
  },
  {
    id: 'determinism',
    label: 'Determinism',
    type: 'CONCEPT' as const,
    connections: 3,
  },
  {
    id: 'causality',
    label: 'Causality',
    type: 'CONCEPT' as const,
    connections: 5,
  },
  {
    id: 'consciousness',
    label: 'Consciousness',
    type: 'CONCEPT' as const,
    connections: 6,
  },
  { id: 'kant', label: 'Kant', type: 'PERSON' as const, connections: 4 },
  {
    id: 'aristotle',
    label: 'Aristotle',
    type: 'PERSON' as const,
    connections: 7,
  },
  { id: 'hume', label: 'Hume', type: 'PERSON' as const, connections: 3 },
  { id: 'ethics', label: 'Ethics', type: 'CONCEPT' as const, connections: 8 },
  { id: 'virtue', label: 'Virtue', type: 'TERM' as const, connections: 2 },
  {
    id: 'critique',
    label: 'Critique of Pure Reason',
    type: 'SOURCE' as const,
    connections: 3,
  },
];

export const MOCK_DISCUSSIONS = [
  {
    id: 'disc-1',
    title: 'Does free will exist?',
    content: 'An exploration of compatibilism vs hard determinism...',
    upvotes: 24,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'disc-2',
    title: "Kant's categorical imperative explained",
    content: 'Breaking down the three formulations...',
    upvotes: 18,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'disc-3',
    title: 'Reading recommendations for beginners',
    content: 'My top picks for getting into philosophy...',
    upvotes: 31,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];
