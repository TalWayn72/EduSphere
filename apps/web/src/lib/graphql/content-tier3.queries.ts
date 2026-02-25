import { gql } from 'urql';

// ─── Media / Alt-Text ─────────────────────────────────────────────────────────
// updateMediaAltText not yet in supergraph; excluded from codegen.
// Used by: AltTextModal.tsx

export const UPDATE_MEDIA_ALT_TEXT_MUTATION = gql`
  mutation UpdateMediaAltText($mediaId: ID!, $altText: String!) {
    updateMediaAltText(mediaId: $mediaId, altText: $altText) {
      id
      altText
    }
  }
`;

// ─── Course Analytics ─────────────────────────────────────────────────────────
// courseAnalytics, atRiskLearners, resolveAtRiskFlag not yet in supergraph.
// Used by: CourseAnalyticsPage.tsx

export const COURSE_ANALYTICS_QUERY = gql`
  query CourseAnalytics($courseId: ID!) {
    courseAnalytics(courseId: $courseId) {
      courseId
      enrollmentCount
      activeLearnersLast7Days
      completionRate
      avgQuizScore
      contentItemMetrics {
        contentItemId
        title
        viewCount
        avgTimeSpentSeconds
        completionRate
      }
      dropOffFunnel {
        moduleId
        moduleName
        learnersStarted
        learnersCompleted
        dropOffRate
      }
    }
  }
`;

export const AT_RISK_LEARNERS_QUERY = gql`
  query AtRiskLearners($courseId: ID!) {
    atRiskLearners(courseId: $courseId) {
      learnerId
      courseId
      riskScore
      flaggedAt
      daysSinceLastActivity
      progressPercent
      riskFactors {
        key
        description
      }
    }
  }
`;

export const RESOLVE_AT_RISK_FLAG_MUTATION = gql`
  mutation ResolveAtRiskFlag($flagId: ID!) {
    resolveAtRiskFlag(flagId: $flagId)
  }
`;

// ─── Content Item CRUD ────────────────────────────────────────────────────────
// createContentItem not yet in supergraph; excluded from codegen.
// Used by: RichDocumentEditor.tsx

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

// ─── F-021 Microlearning ──────────────────────────────────────────────────────
// dailyMicrolesson, microlearningPaths, createMicrolearningPath not yet in supergraph.
// Used by: DailyLearningWidget.tsx

export const DAILY_MICROLESSON_QUERY = gql`
  query DailyMicrolesson {
    dailyMicrolesson {
      id
      title
      content
      contentType
      duration
      orderIndex
      createdAt
    }
  }
`;

export const MICROLEARNING_PATHS_QUERY = gql`
  query MicrolearningPaths {
    microlearningPaths {
      id
      title
      topicClusterId
      contentItemIds
      itemCount
      createdAt
    }
  }
`;

export const CREATE_MICROLEARNING_PATH_MUTATION = gql`
  mutation CreateMicrolearningPath(
    $title: String!
    $contentItemIds: [ID!]!
    $topicClusterId: ID
  ) {
    createMicrolearningPath(
      title: $title
      contentItemIds: $contentItemIds
      topicClusterId: $topicClusterId
    ) {
      id
      title
      itemCount
      createdAt
    }
  }
`;

// ─── F-009 Branching Scenario Operations ──────────────────────────────────────
// scenarioNode, recordScenarioChoice, myScenarioProgress not yet in supergraph.
// Used by: ScenarioPlayer.tsx, useScenarioNode.ts

export const SCENARIO_NODE_QUERY = gql`
  query ScenarioNode($contentItemId: ID!) {
    scenarioNode(contentItemId: $contentItemId) {
      id
      title
      description
      isEndNode
      endingType
      choices {
        id
        text
        nextContentItemId
      }
    }
  }
`;

export const RECORD_SCENARIO_CHOICE_MUTATION = gql`
  mutation RecordScenarioChoice(
    $fromContentItemId: ID!
    $choiceId: String!
    $scenarioRootId: ID!
  ) {
    recordScenarioChoice(
      fromContentItemId: $fromContentItemId
      choiceId: $choiceId
      scenarioRootId: $scenarioRootId
    ) {
      id
      title
      description
      isEndNode
      endingType
      choices {
        id
        text
        nextContentItemId
      }
    }
  }
`;

export const MY_SCENARIO_PROGRESS_QUERY = gql`
  query MyScenarioProgress($scenarioRootId: ID!) {
    myScenarioProgress(scenarioRootId: $scenarioRootId) {
      fromContentItemId
      choiceId
      choiceText
      chosenAt
    }
  }
`;

// ─── F-108 Admin Enrollment Management ────────────────────────────────────────
// adminCourseEnrollments, adminEnrollUser, adminUnenrollUser, adminBulkEnroll
// not yet in supergraph. Used by: EnrollmentManagementPage.tsx

export const ADMIN_COURSE_ENROLLMENTS_QUERY = gql`
  query AdminCourseEnrollments($courseId: ID!) {
    adminCourseEnrollments(courseId: $courseId) {
      id
      courseId
      userId
      status
      enrolledAt
      completedAt
    }
  }
`;

export const ADMIN_ENROLL_USER_MUTATION = gql`
  mutation AdminEnrollUser($courseId: ID!, $userId: ID!) {
    adminEnrollUser(courseId: $courseId, userId: $userId) {
      id
      courseId
      userId
      status
      enrolledAt
    }
  }
`;

export const ADMIN_UNENROLL_USER_MUTATION = gql`
  mutation AdminUnenrollUser($courseId: ID!, $userId: ID!) {
    adminUnenrollUser(courseId: $courseId, userId: $userId)
  }
`;

export const ADMIN_BULK_ENROLL_MUTATION = gql`
  mutation AdminBulkEnroll($courseId: ID!, $userIds: [ID!]!) {
    adminBulkEnroll(courseId: $courseId, userIds: $userIds)
  }
`;
