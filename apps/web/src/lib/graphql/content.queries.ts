import { gql } from 'urql';

// Content queries for learning interface
export const CONTENT_ITEM_QUERY = gql`
  query ContentItem($id: ID!) {
    contentItem(id: $id) {
      id
      moduleId
      title
      contentType
      content
      fileId
      duration
      orderIndex
      createdAt
      updatedAt
    }
  }
`;

export const COURSE_CONTENTS_QUERY = gql`
  query CourseContents($courseId: ID!) {
    course(id: $courseId) {
      id
      title
      description
      modules {
        id
        title
        orderIndex
        contentItems {
          id
          title
          contentType
          orderIndex
        }
      }
    }
  }
`;

export const COURSE_DETAIL_QUERY = gql`
  query CourseDetail($id: ID!) {
    course(id: $id) {
      id
      title
      description
      thumbnailUrl
      estimatedHours
      isPublished
      instructorId
      modules {
        id
        title
        orderIndex
        contentItems {
          id
          title
          contentType
          duration
          orderIndex
        }
      }
    }
  }
`;

// searchTranscripts does not exist in the composed supergraph yet.
// Use searchSemantic (Knowledge subgraph) as the text-search alternative.
export const SEARCH_SEMANTIC_BY_TEXT_QUERY = gql`
  query SearchSemanticByText($query: String!, $limit: Int) {
    searchSemantic(query: $query, limit: $limit) {
      id
      text
      similarity
      entityType
      entityId
    }
  }
`;

export const PRESIGNED_UPLOAD_QUERY = gql`
  query GetPresignedUploadUrl($fileName: String!, $contentType: String!, $courseId: ID!) {
    getPresignedUploadUrl(fileName: $fileName, contentType: $contentType, courseId: $courseId) {
      uploadUrl
      fileKey
      expiresAt
    }
  }
`;

export const CONFIRM_MEDIA_UPLOAD_MUTATION = gql`
  mutation ConfirmMediaUpload($fileKey: String!, $courseId: ID!, $title: String!) {
    confirmMediaUpload(fileKey: $fileKey, courseId: $courseId, title: $title) {
      id
      courseId
      fileKey
      title
      contentType
      status
      downloadUrl
      hlsManifestUrl
    }
  }
`;

export const CREATE_COURSE_MUTATION = gql`
  mutation CreateCourse($input: CreateCourseInput!) {
    createCourse(input: $input) {
      id
      title
      slug
      description
      isPublished
      estimatedHours
      createdAt
    }
  }
`;

export const ENROLL_COURSE_MUTATION = gql`
  mutation EnrollCourse($courseId: ID!) {
    enrollCourse(courseId: $courseId) {
      id
      courseId
      userId
      status
      enrolledAt
    }
  }
`;

export const UNENROLL_COURSE_MUTATION = gql`
  mutation UnenrollCourse($courseId: ID!) {
    unenrollCourse(courseId: $courseId)
  }
`;

export const MY_ENROLLMENTS_QUERY = gql`
  query MyEnrollments {
    myEnrollments {
      id
      courseId
      userId
      status
      enrolledAt
      completedAt
    }
  }
`;

export const MY_COURSE_PROGRESS_QUERY = gql`
  query MyCourseProgress($courseId: ID!) {
    myCourseProgress(courseId: $courseId) {
      courseId
      totalItems
      completedItems
      percentComplete
    }
  }
`;

export const MARK_CONTENT_VIEWED_MUTATION = gql`
  mutation MarkContentViewed($contentItemId: ID!) {
    markContentViewed(contentItemId: $contentItemId)
  }
`;
