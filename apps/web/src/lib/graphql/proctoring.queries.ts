/**
 * Proctoring GraphQL queries and mutations — Phase 33: Remote Proctoring (PRD §7.2 G-4)
 */
import { gql } from '@urql/core';

export const START_PROCTORING_SESSION_MUTATION = gql`
  mutation StartProctoringSession($assessmentId: ID!) {
    startProctoringSession(assessmentId: $assessmentId) {
      id status startedAt flagCount
    }
  }
`;

export const FLAG_PROCTORING_EVENT_MUTATION = gql`
  mutation FlagProctoringEvent($sessionId: ID!, $type: ProctoringFlagType!, $detail: String) {
    flagProctoringEvent(sessionId: $sessionId, type: $type, detail: $detail) {
      id status flagCount flags { type timestamp detail }
    }
  }
`;

export const END_PROCTORING_SESSION_MUTATION = gql`
  mutation EndProctoringSession($sessionId: ID!) {
    endProctoringSession(sessionId: $sessionId) {
      id status endedAt flagCount flags { type timestamp detail }
    }
  }
`;

export const GET_PROCTORING_REPORT_QUERY = gql`
  query GetProctoringReport($assessmentId: ID!) {
    proctoringReport(assessmentId: $assessmentId) {
      id userId status startedAt endedAt flagCount
      flags { type timestamp detail }
    }
  }
`;
