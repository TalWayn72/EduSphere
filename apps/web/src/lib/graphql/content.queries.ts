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

export const UPDATE_MEDIA_ALT_TEXT_MUTATION = gql`
  mutation UpdateMediaAltText($mediaId: ID!, $altText: String!) {
    updateMediaAltText(mediaId: $mediaId, altText: $altText) {
      id
      altText
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

// ─── F-021 Microlearning ────────────────────────────────────────────────────

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

// ─── F-009 Branching Scenario Operations ──────────────────────────────────────

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

// ── F-108 Admin Enrollment Management ────────────────────────────────────────

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
