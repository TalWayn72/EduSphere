/**
 * Mock data for Dashboard in development mode.
 * Separated from Dashboard.tsx to keep the component under the 150-line guideline.
 */

export const MOCK_ME = {
  me: {
    id: 'dev-user-1',
    username: 'developer',
    email: 'dev@edusphere.local',
    firstName: 'Dev',
    lastName: 'User',
    role: 'SUPER_ADMIN',
    tenantId: 'dev-tenant-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

export const MOCK_COURSES = {
  courses: {
    edges: [
      {
        cursor: 'course-1',
        node: {
          id: 'course-1',
          title: 'Introduction to Talmud Study',
          description:
            'Learn the fundamentals of Talmudic reasoning and argumentation',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      {
        cursor: 'course-2',
        node: {
          id: 'course-2',
          title: 'Advanced Chavruta Techniques',
          description:
            'Master the art of collaborative Talmud learning with AI assistance',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      {
        cursor: 'course-3',
        node: {
          id: 'course-3',
          title: 'Knowledge Graph Navigation',
          description:
            'Explore interconnected concepts in Jewish texts using graph-based learning',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    ],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: 'course-1',
      endCursor: 'course-3',
    },
  },
};
