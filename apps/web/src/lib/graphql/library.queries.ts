import { gql } from 'graphql-request';

export const LIBRARY_COURSES_QUERY = gql`
  query LibraryCourses($topic: LibraryTopic) {
    libraryCourses(topic: $topic) {
      id
      title
      description
      topic
      licenseType
      priceCents
      durationMinutes
      isActivated
    }
  }
`;

export const MY_LIBRARY_ACTIVATIONS_QUERY = gql`
  query MyLibraryActivations {
    myLibraryActivations {
      id
      libraryCourseId
      courseId
      activatedAt
    }
  }
`;

export const ACTIVATE_LIBRARY_COURSE_MUTATION = gql`
  mutation ActivateLibraryCourse($libraryCourseId: ID!) {
    activateLibraryCourse(libraryCourseId: $libraryCourseId) {
      id
      libraryCourseId
      courseId
      activatedAt
    }
  }
`;

export const DEACTIVATE_LIBRARY_COURSE_MUTATION = gql`
  mutation DeactivateLibraryCourse($libraryCourseId: ID!) {
    deactivateLibraryCourse(libraryCourseId: $libraryCourseId)
  }
`;
