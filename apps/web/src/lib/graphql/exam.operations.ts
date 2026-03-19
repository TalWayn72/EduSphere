import { gql } from 'urql';

// ── Item Bank Queries ────────────────────────────────────────────────────────

export const EXAM_ITEM_BANK_QUERY = gql`
  query ExamItemBank($courseId: ID!, $filters: ExamItemFilterInput, $first: Int, $after: String) {
    examItemBank(courseId: $courseId, filters: $filters, first: $first, after: $after) {
      edges {
        node {
          id
          courseId
          moduleId
          domainTag
          bloomLevel
          questionData
          irtA
          irtB
          irtC
          calibrationStatus
          source
          qualityTier
          pValue
          rpbis
          exposureCount
          createdAt
        }
        cursor
      }
      nodes {
        id
        courseId
        moduleId
        domainTag
        bloomLevel
        questionData
        irtA
        irtB
        irtC
        calibrationStatus
        source
        qualityTier
        pValue
        rpbis
        exposureCount
        createdAt
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const EXAM_ITEM_QUERY = gql`
  query ExamItem($id: ID!) {
    examItem(id: $id) {
      id
      courseId
      moduleId
      domainTag
      bloomLevel
      questionData
      irtA
      irtB
      irtC
      calibrationStatus
      source
      qualityTier
      pValue
      rpbis
      exposureCount
      createdAt
    }
  }
`;

// ── Item Mutations ───────────────────────────────────────────────────────────

export const CREATE_EXAM_ITEM_MUTATION = gql`
  mutation CreateExamItem($input: CreateExamItemInput!) {
    createExamItem(input: $input) {
      id
      domainTag
      bloomLevel
      calibrationStatus
      createdAt
    }
  }
`;

export const UPDATE_EXAM_ITEM_MUTATION = gql`
  mutation UpdateExamItem($id: ID!, $input: UpdateExamItemInput!) {
    updateExamItem(id: $id, input: $input) {
      id
      domainTag
      bloomLevel
      calibrationStatus
    }
  }
`;

export const RETIRE_EXAM_ITEM_MUTATION = gql`
  mutation RetireExamItem($id: ID!) {
    retireExamItem(id: $id) {
      id
      calibrationStatus
    }
  }
`;

export const GENERATE_EXAM_ITEMS_MUTATION = gql`
  mutation GenerateExamItems($input: GenerateExamItemsInput!) {
    generateExamItems(input: $input) {
      generatedCount
      validCount
      items {
        id
        domainTag
        bloomLevel
        questionData
        calibrationStatus
        source
        qualityTier
        createdAt
      }
    }
  }
`;

// ── Blueprint Queries ────────────────────────────────────────────────────────

export const EXAM_BLUEPRINTS_QUERY = gql`
  query ExamBlueprints($courseId: ID!) {
    examBlueprints(courseId: $courseId) {
      id
      courseId
      title
      description
      status
      totalQuestions
      timeLimitMinutes
      passingMethod
      passingScore
      isAdaptive
      version
      createdAt
    }
  }
`;

export const EXAM_BLUEPRINT_QUERY = gql`
  query ExamBlueprint($id: ID!) {
    examBlueprint(id: $id) {
      id
      courseId
      title
      description
      status
      totalQuestions
      timeLimitMinutes
      passingMethod
      passingScore
      domainDistribution
      bloomDistribution
      shuffleQuestions
      shuffleAnswers
      maxRetakes
      retakeCooldownHours
      isAdaptive
      catMinItems
      catMaxItems
      version
      createdAt
    }
  }
`;

// ── Blueprint Mutations ──────────────────────────────────────────────────────

export const CREATE_EXAM_BLUEPRINT_MUTATION = gql`
  mutation CreateExamBlueprint($input: CreateExamBlueprintInput!) {
    createExamBlueprint(input: $input) {
      id
      title
      status
      createdAt
    }
  }
`;

export const UPDATE_EXAM_BLUEPRINT_MUTATION = gql`
  mutation UpdateExamBlueprint($id: ID!, $input: UpdateExamBlueprintInput!) {
    updateExamBlueprint(id: $id, input: $input) {
      id
      title
      status
    }
  }
`;

// ── Course Modules (for selectors) ───────────────────────────────────────────

export const COURSE_MODULES_QUERY = gql`
  query CourseModulesForExam($courseId: ID!) {
    course(id: $courseId) {
      id
      modules {
        id
        title
        orderIndex
      }
    }
  }
`;
