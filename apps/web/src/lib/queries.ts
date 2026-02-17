import { gql } from 'urql';

export const ME_QUERY = gql`
  query Me {
    me {
      id
      username
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
  query Courses($first: Int, $after: String) {
    courses(first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          title
          description
          createdAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;
