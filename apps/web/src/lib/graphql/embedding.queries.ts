import { gql } from 'urql';

/**
 * Embedding stats for admin dashboard.
 * Returns aggregate counts of sources with/without embeddings.
 */
export const EMBEDDING_STATS_QUERY = gql`
  query EmbeddingStats {
    embeddingStats {
      totalSources
      indexedSources
      pendingSources
      failedSources
      totalChunks
      courseBreakdown {
        courseId
        courseTitle
        sourceCount
        indexedCount
        chunkCount
      }
    }
  }
`;

/**
 * Recent embedding activity log entries.
 * Returns the last N embedding operations across all courses.
 */
export const EMBEDDING_ACTIVITY_QUERY = gql`
  query EmbeddingActivity($limit: Int) {
    embeddingActivity(limit: $limit) {
      id
      timestamp
      courseName
      operation
      status
      count
    }
  }
`;

/**
 * Trigger re-indexing of all course embeddings.
 */
export const REINDEX_COURSE_EMBEDDINGS_MUTATION = gql`
  mutation ReindexCourseEmbeddings($courseId: ID) {
    reindexCourseEmbeddings(courseId: $courseId) {
      success
      jobId
      message
    }
  }
`;
