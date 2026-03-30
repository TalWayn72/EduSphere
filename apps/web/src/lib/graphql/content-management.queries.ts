import { gql } from 'urql';

// ── Course management (instructor / admin) ────────────────────────────────────

export const UPDATE_COURSE_MUTATION = gql`
  mutation UpdateCourse($id: ID!, $input: UpdateCourseInput!) {
    updateCourse(id: $id, input: $input) {
      id
      title
      description
      thumbnailUrl
      estimatedHours
      isPublished
      updatedAt
    }
  }
`;

export const COURSE_READINESS_QUERY = gql`
  query CourseReadiness($courseId: ID!) {
    courseReadiness(courseId: $courseId) {
      ready
      checks {
        name
        passed
        message
      }
    }
  }
`;

export const PUBLISH_COURSE_MUTATION = gql`
  mutation PublishCourse($id: ID!) {
    publishCourse(id: $id) {
      id
      isPublished
      updatedAt
    }
  }
`;

export const UNPUBLISH_COURSE_MUTATION = gql`
  mutation UnpublishCourse($id: ID!) {
    unpublishCourse(id: $id) {
      id
      isPublished
      updatedAt
    }
  }
`;

export const DELETE_COURSE_MUTATION = gql`
  mutation DeleteCourse($id: ID!) {
    deleteCourse(id: $id)
  }
`;

// ── Module management ─────────────────────────────────────────────────────────

export const CREATE_MODULE_MUTATION = gql`
  mutation CreateModule($input: CreateModuleInput!) {
    createModule(input: $input) {
      id
      courseId
      title
      description
      orderIndex
      createdAt
    }
  }
`;

export const UPDATE_MODULE_MUTATION = gql`
  mutation UpdateModule($id: ID!, $input: UpdateModuleInput!) {
    updateModule(id: $id, input: $input) {
      id
      title
      description
      orderIndex
    }
  }
`;

export const DELETE_MODULE_MUTATION = gql`
  mutation DeleteModule($id: ID!) {
    deleteModule(id: $id)
  }
`;

export const REORDER_MODULES_MUTATION = gql`
  mutation ReorderModules($courseId: ID!, $moduleIds: [ID!]!) {
    reorderModules(courseId: $courseId, moduleIds: $moduleIds) {
      id
      orderIndex
    }
  }
`;

// ── Content item management ───────────────────────────────────────────────────

export const CREATE_CONTENT_ITEM_MUTATION = gql`
  mutation CreateContentItem($input: CreateContentItemInput!) {
    createContentItem(input: $input) {
      id
      moduleId
      title
      contentType
      content
      orderIndex
      createdAt
    }
  }
`;

export const FORK_COURSE_MUTATION = gql`
  mutation ForkCourse($courseId: ID!) {
    forkCourse(courseId: $courseId) {
      id
      title
      slug
      forkedFromId
    }
  }
`;

export const SEARCH_COURSES_QUERY = gql`
  query SearchCourses($query: String!, $limit: Int) {
    searchCourses(query: $query, limit: $limit) {
      id
      title
      description
      slug
      isPublished
      estimatedHours
      thumbnailUrl
    }
  }
`;
