import { gql } from 'urql';

export const CREATE_LESSON_MUTATION = gql`
  mutation CreateLesson($input: CreateLessonInput!) {
    createLesson(input: $input) {
      id
      courseId
      title
      type
      status
      createdAt
    }
  }
`;

export const LESSONS_BY_COURSE_QUERY = gql`
  query LessonsByCourse($courseId: ID!, $limit: Int, $offset: Int) {
    lessonsByCourse(courseId: $courseId, limit: $limit, offset: $offset) {
      id
      title
      type
      series
      lessonDate
      status
      createdAt
      assets {
        id
        assetType
        sourceUrl
        fileUrl
      }
    }
  }
`;

export const LESSON_QUERY = gql`
  query Lesson($id: ID!) {
    lesson(id: $id) {
      id
      courseId
      moduleId
      title
      type
      series
      lessonDate
      instructorId
      status
      createdAt
      updatedAt
      assets {
        id
        assetType
        sourceUrl
        fileUrl
        metadata
      }
      pipeline {
        id
        templateName
        nodes
        config
        status
        createdAt
        currentRun {
          id
          status
          startedAt
          completedAt
          logs
          results {
            id
            moduleName
            outputType
            outputData
            fileUrl
            createdAt
          }
        }
      }
      citations {
        id
        sourceText
        bookName
        part
        page
        matchStatus
        confidence
      }
    }
  }
`;

export const SAVE_LESSON_PIPELINE_MUTATION = gql`
  mutation SaveLessonPipeline(
    $lessonId: ID!
    $input: SaveLessonPipelineInput!
  ) {
    saveLessonPipeline(lessonId: $lessonId, input: $input) {
      id
      status
      nodes
      config
      templateName
    }
  }
`;

export const START_PIPELINE_RUN_MUTATION = gql`
  mutation StartLessonPipelineRun($pipelineId: ID!) {
    startLessonPipelineRun(pipelineId: $pipelineId) {
      id
      status
      startedAt
    }
  }
`;

export const CANCEL_PIPELINE_RUN_MUTATION = gql`
  mutation CancelLessonPipelineRun($runId: ID!) {
    cancelLessonPipelineRun(runId: $runId) {
      id
      status
    }
  }
`;

export const ADD_LESSON_ASSET_MUTATION = gql`
  mutation AddLessonAsset($lessonId: ID!, $input: AddLessonAssetInput!) {
    addLessonAsset(lessonId: $lessonId, input: $input) {
      id
      assetType
      sourceUrl
      fileUrl
    }
  }
`;

export const PUBLISH_LESSON_MUTATION = gql`
  mutation PublishLesson($id: ID!) {
    publishLesson(id: $id) {
      id
      status
    }
  }
`;

export const LESSON_PIPELINE_RUNS_QUERY = gql`
  query LessonPipelineRunHistory($lessonId: ID!, $limit: Int) {
    lessonPipelineRuns(lessonId: $lessonId, limit: $limit) {
      id
      runNumber
      status
      triggeredBy
      completedAt
      results {
        id
        moduleName
        outputType
      }
    }
  }
`;

// ─── Pipeline Templates ────────────────────────────────────────────────────

export const PIPELINE_TEMPLATES_QUERY = gql`
  query PipelineTemplates {
    pipelineTemplates {
      id
      tenantId
      name
      description
      nodes
      config
      isSystem
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_PIPELINE_TEMPLATE_MUTATION = gql`
  mutation CreatePipelineTemplate($input: CreatePipelineTemplateInput!) {
    createPipelineTemplate(input: $input) {
      id
      name
      description
      nodes
      config
      isSystem
      createdAt
    }
  }
`;

export const UPDATE_PIPELINE_TEMPLATE_MUTATION = gql`
  mutation UpdatePipelineTemplate(
    $id: ID!
    $input: UpdatePipelineTemplateInput!
  ) {
    updatePipelineTemplate(id: $id, input: $input) {
      id
      name
      description
      nodes
      config
      updatedAt
    }
  }
`;

export const DELETE_PIPELINE_TEMPLATE_MUTATION = gql`
  mutation DeletePipelineTemplate($id: ID!) {
    deletePipelineTemplate(id: $id)
  }
`;

export const LESSON_PIPELINE_PROGRESS_SUBSCRIPTION = gql`
  subscription LessonPipelineProgress($runId: ID!) {
    lessonPipelineProgress(runId: $runId) {
      id
      status
      completedAt
      results {
        id
        moduleName
        outputType
        outputData
        fileUrl
      }
    }
  }
`;
