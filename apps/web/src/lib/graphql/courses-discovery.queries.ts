import { gql } from 'urql';

// Courses discovery query — matches course.graphql SDL exactly.
// Tenant isolation is enforced via JWT/RLS on the server side (no tenantId arg).
export const COURSES_DISCOVERY_QUERY = gql`
  query CoursesDiscovery($limit: Int, $offset: Int) {
    courses(limit: $limit, offset: $offset) {
      id
      title
      description
      thumbnailUrl
      estimatedHours
      isPublished
      instructorId
      slug
      createdAt
    }
  }
`;

export const SEARCH_COURSES_DISCOVERY_QUERY = gql`
  query SearchCoursesDiscovery($query: String!, $limit: Int) {
    searchCourses(query: $query, limit: $limit) {
      id
      title
      description
      thumbnailUrl
      estimatedHours
      isPublished
      slug
    }
  }
`;
