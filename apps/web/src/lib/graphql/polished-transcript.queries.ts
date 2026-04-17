/**
 * GraphQL queries, mutations, and subscriptions for polished transcript
 * track-changes review feature.
 *
 * Follow the same urql/gql pattern as enriched-lesson.queries.ts.
 */
import { gql } from 'urql';

// ── Fragments ─────────────────────────────────────────────────────────────────

const POLISHED_CHANGE_FIELDS = gql`
  fragment PolishedChangeFields on PolishedChange {
    id
    changeType
    originalText
    replacementText
    charOffsetStart
    charOffsetEnd
    decision
  }
`;

const VOICE_PROFILE_FIELDS = gql`
  fragment VoiceProfileFields on VoiceProfile {
    id
    instructorId
    displayName
    avgWordsPerSentence
    formalityScore
    topPhrases
    lastUpdatedAt
  }
`;

// ── Queries ───────────────────────────────────────────────────────────────────

export const POLISHED_TRANSCRIPT_QUERY = gql`
  query PolishedTranscript($lessonId: ID!) {
    polishedTranscript(lessonId: $lessonId) {
      id
      lessonId
      rawText
      polishedText
      status
      polishingProgress
      changes {
        ...PolishedChangeFields
      }
      voiceProfile {
        ...VoiceProfileFields
      }
    }
  }
  ${POLISHED_CHANGE_FIELDS}
  ${VOICE_PROFILE_FIELDS}
`;

// ── Mutations ─────────────────────────────────────────────────────────────────

export const REQUEST_TRANSCRIPT_POLISHING_MUTATION = gql`
  mutation RequestTranscriptPolishing($lessonId: ID!) {
    requestTranscriptPolishing(lessonId: $lessonId) {
      id
      status
      polishingProgress
    }
  }
`;

export const ACCEPT_POLISHING_CHANGE_MUTATION = gql`
  mutation AcceptPolishingChange($changeId: ID!) {
    acceptPolishingChange(changeId: $changeId) {
      id
      decision
    }
  }
`;

export const REJECT_POLISHING_CHANGE_MUTATION = gql`
  mutation RejectPolishingChange($changeId: ID!) {
    rejectPolishingChange(changeId: $changeId) {
      id
      decision
    }
  }
`;

export const ACCEPT_ALL_POLISHING_CHANGES_MUTATION = gql`
  mutation AcceptAllPolishingChanges($transcriptId: ID!) {
    acceptAllPolishingChanges(transcriptId: $transcriptId) {
      id
      changes {
        ...PolishedChangeFields
      }
    }
  }
  ${POLISHED_CHANGE_FIELDS}
`;

export const REJECT_ALL_POLISHING_CHANGES_MUTATION = gql`
  mutation RejectAllPolishingChanges($transcriptId: ID!) {
    rejectAllPolishingChanges(transcriptId: $transcriptId) {
      id
      changes {
        ...PolishedChangeFields
      }
    }
  }
  ${POLISHED_CHANGE_FIELDS}
`;

export const APPROVE_POLISHED_TRANSCRIPT_MUTATION = gql`
  mutation ApprovePolishedTranscript($transcriptId: ID!) {
    approvePolishedTranscript(transcriptId: $transcriptId) {
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
