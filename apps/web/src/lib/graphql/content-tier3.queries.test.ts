import { describe, it, expect } from 'vitest';
import {
  UPDATE_MEDIA_ALT_TEXT_MUTATION,
  COURSE_ANALYTICS_QUERY,
  AT_RISK_LEARNERS_QUERY,
  RESOLVE_AT_RISK_FLAG_MUTATION,
  CREATE_CONTENT_ITEM_MUTATION,
  DAILY_MICROLESSON_QUERY,
  MICROLEARNING_PATHS_QUERY,
  CREATE_MICROLEARNING_PATH_MUTATION,
  SCENARIO_NODE_QUERY,
  RECORD_SCENARIO_CHOICE_MUTATION,
  MY_SCENARIO_PROGRESS_QUERY,
  ADMIN_COURSE_ENROLLMENTS_QUERY,
  ADMIN_ENROLL_USER_MUTATION,
  ADMIN_UNENROLL_USER_MUTATION,
  ADMIN_BULK_ENROLL_MUTATION,
} from './content-tier3.queries';

describe('content-tier3.queries', () => {
  it('exports UPDATE_MEDIA_ALT_TEXT_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_MEDIA_ALT_TEXT_MUTATION).toBeDefined();
    expect(UPDATE_MEDIA_ALT_TEXT_MUTATION.kind).toBe('Document');
    expect(
      UPDATE_MEDIA_ALT_TEXT_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = UPDATE_MEDIA_ALT_TEXT_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateMediaAltText');
  });

  it('exports COURSE_ANALYTICS_QUERY as a query DocumentNode', () => {
    expect(COURSE_ANALYTICS_QUERY).toBeDefined();
    expect(COURSE_ANALYTICS_QUERY.kind).toBe('Document');
    expect(COURSE_ANALYTICS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = COURSE_ANALYTICS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('CourseAnalytics');
  });

  it('exports AT_RISK_LEARNERS_QUERY as a query DocumentNode', () => {
    expect(AT_RISK_LEARNERS_QUERY).toBeDefined();
    expect(AT_RISK_LEARNERS_QUERY.kind).toBe('Document');
    expect(AT_RISK_LEARNERS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = AT_RISK_LEARNERS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('AtRiskLearners');
  });

  it('exports RESOLVE_AT_RISK_FLAG_MUTATION as a mutation DocumentNode', () => {
    expect(RESOLVE_AT_RISK_FLAG_MUTATION).toBeDefined();
    expect(RESOLVE_AT_RISK_FLAG_MUTATION.kind).toBe('Document');
    expect(
      RESOLVE_AT_RISK_FLAG_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = RESOLVE_AT_RISK_FLAG_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('ResolveAtRiskFlag');
  });

  it('exports CREATE_CONTENT_ITEM_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_CONTENT_ITEM_MUTATION).toBeDefined();
    expect(CREATE_CONTENT_ITEM_MUTATION.kind).toBe('Document');
    expect(
      CREATE_CONTENT_ITEM_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = CREATE_CONTENT_ITEM_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateContentItem');
  });

  it('exports DAILY_MICROLESSON_QUERY as a query DocumentNode', () => {
    expect(DAILY_MICROLESSON_QUERY).toBeDefined();
    expect(DAILY_MICROLESSON_QUERY.kind).toBe('Document');
    expect(DAILY_MICROLESSON_QUERY.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = DAILY_MICROLESSON_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('DailyMicrolesson');
  });

  it('exports MICROLEARNING_PATHS_QUERY as a query DocumentNode', () => {
    expect(MICROLEARNING_PATHS_QUERY).toBeDefined();
    expect(MICROLEARNING_PATHS_QUERY.kind).toBe('Document');
    expect(MICROLEARNING_PATHS_QUERY.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = MICROLEARNING_PATHS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MicrolearningPaths');
  });

  it('exports CREATE_MICROLEARNING_PATH_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_MICROLEARNING_PATH_MUTATION).toBeDefined();
    expect(CREATE_MICROLEARNING_PATH_MUTATION.kind).toBe('Document');
    expect(
      CREATE_MICROLEARNING_PATH_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = CREATE_MICROLEARNING_PATH_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateMicrolearningPath');
  });

  it('exports SCENARIO_NODE_QUERY as a query DocumentNode', () => {
    expect(SCENARIO_NODE_QUERY).toBeDefined();
    expect(SCENARIO_NODE_QUERY.kind).toBe('Document');
    expect(SCENARIO_NODE_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SCENARIO_NODE_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('ScenarioNode');
  });

  it('exports RECORD_SCENARIO_CHOICE_MUTATION as a mutation DocumentNode', () => {
    expect(RECORD_SCENARIO_CHOICE_MUTATION).toBeDefined();
    expect(RECORD_SCENARIO_CHOICE_MUTATION.kind).toBe('Document');
    expect(
      RECORD_SCENARIO_CHOICE_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = RECORD_SCENARIO_CHOICE_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('RecordScenarioChoice');
  });

  it('exports MY_SCENARIO_PROGRESS_QUERY as a query DocumentNode', () => {
    expect(MY_SCENARIO_PROGRESS_QUERY).toBeDefined();
    expect(MY_SCENARIO_PROGRESS_QUERY.kind).toBe('Document');
    expect(
      MY_SCENARIO_PROGRESS_QUERY.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = MY_SCENARIO_PROGRESS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyScenarioProgress');
  });

  it('exports ADMIN_COURSE_ENROLLMENTS_QUERY as a query DocumentNode', () => {
    expect(ADMIN_COURSE_ENROLLMENTS_QUERY).toBeDefined();
    expect(ADMIN_COURSE_ENROLLMENTS_QUERY.kind).toBe('Document');
    expect(
      ADMIN_COURSE_ENROLLMENTS_QUERY.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = ADMIN_COURSE_ENROLLMENTS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('AdminCourseEnrollments');
  });

  it('exports ADMIN_ENROLL_USER_MUTATION as a mutation DocumentNode', () => {
    expect(ADMIN_ENROLL_USER_MUTATION).toBeDefined();
    expect(ADMIN_ENROLL_USER_MUTATION.kind).toBe('Document');
    expect(
      ADMIN_ENROLL_USER_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = ADMIN_ENROLL_USER_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('AdminEnrollUser');
  });

  it('exports ADMIN_UNENROLL_USER_MUTATION as a mutation DocumentNode', () => {
    expect(ADMIN_UNENROLL_USER_MUTATION).toBeDefined();
    expect(ADMIN_UNENROLL_USER_MUTATION.kind).toBe('Document');
    expect(
      ADMIN_UNENROLL_USER_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = ADMIN_UNENROLL_USER_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('AdminUnenrollUser');
  });

  it('exports ADMIN_BULK_ENROLL_MUTATION as a mutation DocumentNode', () => {
    expect(ADMIN_BULK_ENROLL_MUTATION).toBeDefined();
    expect(ADMIN_BULK_ENROLL_MUTATION.kind).toBe('Document');
    expect(
      ADMIN_BULK_ENROLL_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = ADMIN_BULK_ENROLL_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('AdminBulkEnroll');
  });
});
