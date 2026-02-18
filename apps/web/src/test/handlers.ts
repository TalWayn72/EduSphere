import { graphql, HttpResponse } from 'msw';

// Default MSW handlers for GraphQL operations
// Override in specific tests with server.use(handler)
export const handlers = [
  // Placeholder: dashboard query
  graphql.query('GetDashboard', () => {
    return HttpResponse.json({
      data: {
        me: { id: 'user-1', displayName: 'Test User', email: 'test@example.com' },
      },
    });
  }),

  // Placeholder: courses query
  graphql.query('GetCourses', () => {
    return HttpResponse.json({
      data: {
        courses: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
      },
    });
  }),
];
