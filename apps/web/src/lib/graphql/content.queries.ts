import { gql } from 'urql';

// Content queries for learning interface
export const CONTENT_ITEM_QUERY = gql`
  query ContentItem($id: ID!) {
    contentItem(id: $id) {
      id
      title
      description
      contentType
      contentData
      assetId
      mediaAsset {
        id
        filename
        mimeType
        size
        url
        thumbnailUrl
        duration
        metadata
      }
      transcript {
        id
        segments {
          id
          startTime
          endTime
          text
          confidence
          speakerId
        }
        language
        confidence
      }
      course {
        id
        title
        description
      }
      createdAt
      updatedAt
    }
  }
`;

export const COURSE_CONTENTS_QUERY = gql`
  query CourseContents($courseId: ID!, $first: Int, $after: String) {
    course(id: $courseId) {
      id
      title
      description
      modules {
        id
        title
        order
        contentItems {
          id
          title
          description
          contentType
          order
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

export const SEARCH_TRANSCRIPTS_QUERY = gql`
  query SearchTranscripts($query: String!, $courseId: ID, $first: Int) {
    searchTranscripts(query: $query, courseId: $courseId, first: $first) {
      edges {
        node {
          id
          text
          startTime
          endTime
          contentItem {
            id
            title
            assetId
          }
          highlights
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const SEMANTIC_SEARCH_QUERY = gql`
  query SemanticSearch($query: String!, $limit: Int, $threshold: Float) {
    semanticSearch(query: $query, limit: $limit, threshold: $threshold) {
      id
      content
      similarity
      entityType
      entityId
      metadata
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
