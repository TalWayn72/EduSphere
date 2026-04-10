/**
 * GraphQL queries and mutations for enriched lesson CRUD.
 */
import { gql } from 'urql';

// ── Fragments ────────────────────────────────────────────────────────────────

const CITATION_FIELDS = gql`
  fragment CitationFields on LessonCitation {
    id
    sourceText
    bookName
    part
    page
    column
    paragraph
    matchStatus
    confidence
  }
`;

const ENRICHED_BLOCK_FIELDS = gql`
  fragment EnrichedBlockFields on EnrichedTranscriptBlock {
    id
    lessonId
    segmentId
    blockType
    blockOrder
    content
    startTime
    endTime
    citation {
      ...CitationFields
    }
    anchor {
      id
      anchorText
    }
  }
  ${CITATION_FIELDS}
`;

// ── Queries ──────────────────────────────────────────────────────────────────

export const ENRICHED_LESSON_QUERY = gql`
  query EnrichedLesson($lessonId: ID!) {
    enrichedLesson(lessonId: $lessonId) {
      id
      youtubeVideoId
      transcriptReady
      enrichmentStatus
      blocks {
        ...EnrichedBlockFields
      }
      citations {
        ...CitationFields
      }
    }
  }
  ${ENRICHED_BLOCK_FIELDS}
`;

// ── Mutations ────────────────────────────────────────────────────────────────

export const INGEST_YOUTUBE_LESSON_MUTATION = gql`
  mutation IngestYoutubeLesson($input: IngestYoutubeLessonInput!) {
    ingestYoutubeLesson(input: $input) {
      id
      youtubeVideoId
      enrichmentStatus
    }
  }
`;

export const UPDATE_CITATION_MUTATION = gql`
  mutation UpdateLessonCitation(
    $citationId: ID!
    $input: UpdateCitationInput!
  ) {
    updateLessonCitation(citationId: $citationId, input: $input) {
      ...CitationFields
    }
  }
  ${CITATION_FIELDS}
`;

export const SET_BLOCK_ANCHOR_TIMESTAMP_MUTATION = gql`
  mutation SetBlockAnchorTimestamp($input: SetBlockAnchorTimestampInput!) {
    setBlockAnchorTimestamp(input: $input) {
      id
      startTime
      endTime
    }
  }
`;

export const PUBLISH_ENRICHED_LESSON_MUTATION = gql`
  mutation PublishEnrichedLesson($lessonId: ID!) {
    publishEnrichedLesson(lessonId: $lessonId) {
      id
      enrichmentStatus
    }
  }
`;
