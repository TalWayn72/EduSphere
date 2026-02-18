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
