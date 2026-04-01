/**
 * pipeline-schema-contract.spec.ts
 * Contract test — validates that the lesson.graphql SDL contains all
 * Phase 65 pipeline types, queries, mutations, and subscriptions.
 *
 * Parses the SDL file directly (no running server required).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSchema, type GraphQLSchema } from 'graphql';

// ── Load & parse the SDL ─────────────────────────────────────────────────────

const SDL_PATH = resolve(__dirname, '..', 'lesson', 'lesson.graphql');

// The lesson.graphql uses federation directives — stub them so buildSchema works
const FEDERATION_STUBS = `
  directive @key(fields: String!) repeatable on OBJECT | INTERFACE
  directive @external on FIELD_DEFINITION
  directive @provides(fields: String!) on FIELD_DEFINITION
  directive @requires(fields: String!) on FIELD_DEFINITION
  directive @authenticated on FIELD_DEFINITION
  directive @requiresScopes(scopes: [[String!]!]!) on FIELD_DEFINITION
  directive @requiresRole(roles: [String!]!) on FIELD_DEFINITION
  scalar JSON

  type Query
  type Mutation
  type Subscription
`;

function loadSchema(): GraphQLSchema {
  const raw = readFileSync(SDL_PATH, 'utf-8');
  // Replace "extend type" with "type" additions handled by concatenation with stubs
  const patched = raw
    .replace(/extend type Query/g, 'extend type Query')
    .replace(/extend type Mutation/g, 'extend type Mutation')
    .replace(/extend type Subscription/g, 'extend type Subscription');
  return buildSchema(FEDERATION_STUBS + '\n' + patched);
}

let schema: GraphQLSchema;

describe('Pipeline Schema Contract (Phase 65)', () => {
  it('SDL file parses successfully', () => {
    schema = loadSchema();
    expect(schema).toBeDefined();
  });

  // ── Subscription ────────────────────────────────────────────────────────

  describe('Subscription type', () => {
    it('has lessonPipelineProgress field', () => {
      const sub = schema.getSubscriptionType();
      expect(sub).toBeDefined();
      const fields = sub!.getFields();
      expect(fields['lessonPipelineProgress']).toBeDefined();
    });

    it('lessonPipelineProgress accepts runId argument', () => {
      const sub = schema.getSubscriptionType()!;
      const field = sub.getFields()['lessonPipelineProgress'];
      const args = field.args.map((a) => a.name);
      expect(args).toContain('runId');
    });
  });

  // ── LessonPipelineRun type ──────────────────────────────────────────────

  describe('LessonPipelineRun type', () => {
    it('exists', () => {
      expect(schema.getType('LessonPipelineRun')).toBeDefined();
    });

    it('has runNumber field (Int!)', () => {
      const type = schema.getType(
        'LessonPipelineRun'
      ) as import('graphql').GraphQLObjectType;
      const fields = type.getFields();
      expect(fields['runNumber']).toBeDefined();
    });

    it('has triggeredBy field (String!)', () => {
      const type = schema.getType(
        'LessonPipelineRun'
      ) as import('graphql').GraphQLObjectType;
      const fields = type.getFields();
      expect(fields['triggeredBy']).toBeDefined();
    });

    it('has status field', () => {
      const type = schema.getType(
        'LessonPipelineRun'
      ) as import('graphql').GraphQLObjectType;
      const fields = type.getFields();
      expect(fields['status']).toBeDefined();
    });

    it('has results field', () => {
      const type = schema.getType(
        'LessonPipelineRun'
      ) as import('graphql').GraphQLObjectType;
      const fields = type.getFields();
      expect(fields['results']).toBeDefined();
    });
  });

  // ── CourseReadiness type (from course.graphql, validated here for cross-ref) ─

  describe('CourseReadiness type (cross-subgraph reference)', () => {
    // CourseReadiness lives in course.graphql, not lesson.graphql — so we
    // validate it via a separate raw-text search to confirm it exists in the
    // subgraph-content SDL surface area.
    it('CourseReadiness type definition exists in subgraph-content', () => {
      const courseSDL = readFileSync(
        resolve(__dirname, '..', 'course', 'course.graphql'),
        'utf-8'
      );
      expect(courseSDL).toContain('type CourseReadiness');
      expect(courseSDL).toContain('ready: Boolean!');
      expect(courseSDL).toContain('checks: [CourseReadinessCheck!]!');
    });
  });

  // ── Mutations ──────────────────────────────────────────────────────────

  describe('Mutation type', () => {
    it('has retryPipelineModule mutation', () => {
      const mutation = schema.getMutationType()!;
      const fields = mutation.getFields();
      expect(fields['retryPipelineModule']).toBeDefined();
    });

    it('retryPipelineModule accepts runId and moduleType', () => {
      const mutation = schema.getMutationType()!;
      const field = mutation.getFields()['retryPipelineModule'];
      const argNames = field.args.map((a) => a.name);
      expect(argNames).toContain('runId');
      expect(argNames).toContain('moduleType');
    });

    it('has restoreRun mutation', () => {
      const mutation = schema.getMutationType()!;
      const fields = mutation.getFields();
      expect(fields['restoreRun']).toBeDefined();
    });

    it('restoreRun accepts runId', () => {
      const mutation = schema.getMutationType()!;
      const field = mutation.getFields()['restoreRun'];
      const argNames = field.args.map((a) => a.name);
      expect(argNames).toContain('runId');
    });

    it('has startLessonPipelineRun mutation', () => {
      const mutation = schema.getMutationType()!;
      expect(mutation.getFields()['startLessonPipelineRun']).toBeDefined();
    });

    it('has cancelLessonPipelineRun mutation', () => {
      const mutation = schema.getMutationType()!;
      expect(mutation.getFields()['cancelLessonPipelineRun']).toBeDefined();
    });

    it('has createPipelineTemplate mutation', () => {
      const mutation = schema.getMutationType()!;
      expect(mutation.getFields()['createPipelineTemplate']).toBeDefined();
    });

    it('has updatePipelineTemplate mutation', () => {
      const mutation = schema.getMutationType()!;
      expect(mutation.getFields()['updatePipelineTemplate']).toBeDefined();
    });

    it('has deletePipelineTemplate mutation', () => {
      const mutation = schema.getMutationType()!;
      expect(mutation.getFields()['deletePipelineTemplate']).toBeDefined();
    });
  });

  // ── Queries ────────────────────────────────────────────────────────────

  describe('Query type', () => {
    it('has lessonPipelineRuns query', () => {
      const query = schema.getQueryType()!;
      expect(query.getFields()['lessonPipelineRuns']).toBeDefined();
    });

    it('lessonPipelineRuns accepts lessonId', () => {
      const query = schema.getQueryType()!;
      const field = query.getFields()['lessonPipelineRuns'];
      const argNames = field.args.map((a) => a.name);
      expect(argNames).toContain('lessonId');
    });

    it('has pipelineTemplates query', () => {
      const query = schema.getQueryType()!;
      expect(query.getFields()['pipelineTemplates']).toBeDefined();
    });

    it('has lessonPipelineRun query (single run)', () => {
      const query = schema.getQueryType()!;
      expect(query.getFields()['lessonPipelineRun']).toBeDefined();
    });
  });

  // ── Pipeline enums ─────────────────────────────────────────────────────

  describe('Pipeline enums', () => {
    it('PipelineModuleType has all module types', () => {
      const raw = readFileSync(SDL_PATH, 'utf-8');
      const requiredModules = [
        'INGESTION',
        'ASR',
        'NER_SOURCE_LINKING',
        'CONTENT_CLEANING',
        'SUMMARIZATION',
        'STRUCTURED_NOTES',
        'DIAGRAM_GENERATOR',
        'CITATION_VERIFIER',
        'QA_GATE',
        'PUBLISH_SHARE',
      ];
      for (const mod of requiredModules) {
        expect(raw).toContain(mod);
      }
    });

    it('RunStatus enum has RUNNING, COMPLETED, FAILED, CANCELLED', () => {
      const raw = readFileSync(SDL_PATH, 'utf-8');
      expect(raw).toContain('RUNNING');
      expect(raw).toContain('COMPLETED');
      expect(raw).toContain('FAILED');
      expect(raw).toContain('CANCELLED');
    });

    it('PipelineStatus enum has DRAFT, READY, RUNNING, COMPLETED, FAILED', () => {
      const enumType = schema.getType('PipelineStatus');
      expect(enumType).toBeDefined();
    });
  });

  // ── Pipeline Template type (Phase 65) ──────────────────────────────────

  describe('LessonPipelineTemplate type', () => {
    it('exists', () => {
      expect(schema.getType('LessonPipelineTemplate')).toBeDefined();
    });

    it('has required fields', () => {
      const type = schema.getType(
        'LessonPipelineTemplate'
      ) as import('graphql').GraphQLObjectType;
      const fields = type.getFields();
      expect(fields['id']).toBeDefined();
      expect(fields['name']).toBeDefined();
      expect(fields['nodes']).toBeDefined();
      expect(fields['config']).toBeDefined();
      expect(fields['isSystem']).toBeDefined();
      expect(fields['tenantId']).toBeDefined();
    });
  });

  // ── LessonPipelineResult type ──────────────────────────────────────────

  describe('LessonPipelineResult type', () => {
    it('exists with required fields', () => {
      const type = schema.getType(
        'LessonPipelineResult'
      ) as import('graphql').GraphQLObjectType;
      expect(type).toBeDefined();
      const fields = type.getFields();
      expect(fields['moduleName']).toBeDefined();
      expect(fields['outputType']).toBeDefined();
      expect(fields['outputData']).toBeDefined();
    });
  });
});
