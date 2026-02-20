import { gql } from 'urql';

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      firstName
      lastName
      role
      tenantId
      createdAt
      updatedAt
    }
  }
`;

export const TENANT_QUERY = gql`
  query Tenant($id: ID!) {
    tenant(id: $id) {
      id
      name
      slug
      settings
      createdAt
      updatedAt
    }
  }
`;

export const COURSES_QUERY = gql`
  query Courses($limit: Int, $offset: Int) {
    courses(limit: $limit, offset: $offset) {
      id
      title
      description
      slug
      thumbnailUrl
      instructorId
      isPublished
      estimatedHours
      createdAt
      updatedAt
    }
  }
`;

export const MY_STATS_QUERY = gql`
  query MyStats {
    myStats {
      coursesEnrolled
      annotationsCreated
      conceptsMastered
      totalLearningMinutes
      weeklyActivity {
        date
        count
      }
    }
  }
`;
