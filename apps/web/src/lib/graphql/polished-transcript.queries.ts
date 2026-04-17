/**
 * GraphQL queries, mutations, and subscriptions for polished transcript
 * track-changes review feature.
 *
 * Follow the same urql/gql pattern as enriched-lesson.queries.ts.
 */
import { gql } from 'urql';

// ── Fragments ─────────────────────────────────────────────────────────────────

const POLISHED_BLOCK_CHANGE_FIELDS = gql`
  fragment PolishedBlockChangeFields on PolishedBlockChange {
    id
    blockId
    changeType
    originalFragment
    replacementFragment
    charOffsetStart
    charOffsetEnd
    status
    reviewedAt
    createdAt
  }
`;

const POLISHED_TRANSCRIPT_BLOCK_FIELDS = gql`
  fragment PolishedTranscriptBlockFields on PolishedTranscriptBlock {
    id
    polishedId
    blockType
    blockOrder
    content
    originalText
    startTime
    endTime
    sourceSegmentIds
    instructorEdited
    instructorText
    changes {
      ...PolishedBlockChangeFields
    }
  }
  ${POLISHED_BLOCK_CHANGE_FIELDS}
`;

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Lightweight status-only query used by PolishingProgressOverlay for HTTP polling
 * when WebSocket is unavailable. Avoids fetching heavy block data.
 */
export const POLISHED_TRANSCRIPT_STATUS_QUERY = gql`
  query PolishedTranscriptStatus($lessonId: ID!) {
    polishedTranscript(lessonId: $lessonId) {
      id
      status
    }
  }
`;

export const POLISHED_TRANSCRIPT_QUERY = gql`
  query PolishedTranscript($lessonId: ID!) {
    polishedTranscript(lessonId: $lessonId) {
      id
      lessonId
      version
      status
      fullText
      coverageScore
      polishedBy
      approvedAt
      blocks {
        ...PolishedTranscriptBlockFields
      }
      createdAt
      updatedAt
    }
  }
  ${POLISHED_TRANSCRIPT_BLOCK_FIELDS}
`;

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Trigger a new polishing run (creates a new version). */
export const REQUEST_TRANSCRIPT_POLISHING_MUTATION = gql`
  mutation RegeneratePolishedTranscript($lessonId: ID!) {
    regeneratePolishedTranscript(lessonId: $lessonId) {
      id
      status
      version
    }
  }
`;

/** Accept or reject a single tracked change within a block. */
export const ACCEPT_POLISHING_CHANGE_MUTATION = gql`
  mutation DecidePolishedChangeAccept($changeId: ID!) {
    decidePolishedChange(input: { changeId: $changeId, decision: ACCEPTED }) {
      id
      status
    }
  }
`;

/** Reject a single tracked change within a block. */
export const REJECT_POLISHING_CHANGE_MUTATION = gql`
  mutation DecidePolishedChangeReject($changeId: ID!) {
    decidePolishedChange(input: { changeId: $changeId, decision: REJECTED }) {
      id
      status
    }
  }
`;

/** Accept ALL pending changes for a polished transcript. */
export const ACCEPT_ALL_POLISHING_CHANGES_MUTATION = gql`
  mutation BulkAcceptPolishedChanges($transcriptId: ID!) {
    bulkDecidePolishedChanges(
      input: { polishedTranscriptId: $transcriptId, decision: ACCEPTED }
    ) {
      id
      blocks {
        ...PolishedTranscriptBlockFields
      }
    }
  }
  ${POLISHED_TRANSCRIPT_BLOCK_FIELDS}
`;

/** Reject ALL pending changes for a polished transcript. */
export const REJECT_ALL_POLISHING_CHANGES_MUTATION = gql`
  mutation BulkRejectPolishedChanges($transcriptId: ID!) {
    bulkDecidePolishedChanges(
      input: { polishedTranscriptId: $transcriptId, decision: REJECTED }
    ) {
      id
      blocks {
        ...PolishedTranscriptBlockFields
      }
    }
  }
  ${POLISHED_TRANSCRIPT_BLOCK_FIELDS}
`;

/** Approve the polished transcript → sets status to PUBLISHED. */
export const APPROVE_POLISHED_TRANSCRIPT_MUTATION = gql`
  mutation ApprovePolishedTranscript($transcriptId: ID!) {
    approvePolishedTranscript(polishedTranscriptId: $transcriptId) {
      id
      status
    }
  }
`;

// ── Subscriptions ─────────────────────────────────────────────────────────────

export const POLISHING_PROGRESS_SUBSCRIPTION = gql`
  subscription PolishingProgress($lessonId: ID!) {
    polishingProgress(lessonId: $lessonId) {
      lessonId
      progress
      status
    }
  }
`;
