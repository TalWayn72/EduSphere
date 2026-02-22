/** Schema Contract Tests
 * Validates all frontend GraphQL operations against the composed supergraph.
 * Translation queries excluded - not in supergraph yet.
 */
import { describe, it, expect } from 'vitest';
import { parse, validate, buildASTSchema, type DocumentNode } from 'graphql';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const supergraphSDL = readFileSync(path.join(root, 'apps/gateway/supergraph.graphql'), 'utf-8');

const schema = buildASTSchema(parse(supergraphSDL), { assumeValidSDL: true });

function assertValid(operationName: string, doc: DocumentNode): void {
  const errors = validate(schema, doc);
  if (errors.length > 0) {
    const msgs = errors.map((e) => e.message).join(', ');
    throw new Error(`Operation ${operationName} failed: ${msgs}`);
  }
}

// ---- annotation.queries.ts
const ANNOTATIONS_QUERY_DOC = parse(`
  query Annotations($assetId: ID!) {
    annotations(assetId: $assetId) { id layer annotationType content spatialData parentId userId isResolved createdAt updatedAt }
  }
`);

const MY_ANNOTATIONS_QUERY_DOC = parse(`
  query MyAnnotations($userId: ID!, $limit: Int, $offset: Int) {
    annotationsByUser(userId: $userId, limit: $limit, offset: $offset) { id assetId userId layer annotationType content spatialData parentId isResolved createdAt updatedAt }
  }
`);

const REPLY_TO_ANNOTATION_MUTATION_DOC = parse(`
  mutation ReplyToAnnotation($annotationId: ID!, $content: String!) {
    replyToAnnotation(annotationId: $annotationId, content: $content) { id content userId parentId layer annotationType createdAt updatedAt }
  }
`);

// ---- annotation.mutations.ts
const CREATE_ANNOTATION_MUTATION_DOC = parse(`
  mutation CreateAnnotation($input: CreateAnnotationInput!) { createAnnotation(input: $input) { id assetId userId layer annotationType content spatialData parentId isResolved createdAt updatedAt } }
`);

const UPDATE_ANNOTATION_MUTATION_DOC = parse(`
  mutation UpdateAnnotation($id: ID!, $input: UpdateAnnotationInput!) { updateAnnotation(id: $id, input: $input) { id content spatialData layer isResolved updatedAt } }
`);

const DELETE_ANNOTATION_MUTATION_DOC = parse(`
  mutation DeleteAnnotation($id: ID!) { deleteAnnotation(id: $id) }
`);

const ANNOTATIONS_BY_ASSET_QUERY_DOC = parse(`
  query AnnotationsByAsset($assetId: ID!, $layer: AnnotationLayer) { annotationsByAsset(assetId: $assetId, layer: $layer) { id assetId userId layer annotationType content spatialData parentId isResolved createdAt updatedAt } }
`);

const ANNOTATION_ADDED_SUBSCRIPTION_DOC = parse(`
  subscription AnnotationAdded($assetId: ID!) { annotationAdded(assetId: $assetId) { id assetId userId layer annotationType content spatialData createdAt updatedAt } }
`);

// ---- content.queries.ts
const CONTENT_ITEM_QUERY_DOC = parse(`
  query ContentItem($id: ID!) { contentItem(id: $id) { id moduleId title contentType content fileId duration orderIndex createdAt updatedAt } }
`);

const COURSE_CONTENTS_QUERY_DOC = parse(`
  query CourseContents($courseId: ID!) { course(id: $courseId) { id title description modules { id title orderIndex contentItems { id title contentType orderIndex } } } }
`);

const COURSE_DETAIL_QUERY_DOC = parse(`
  query CourseDetail($id: ID!) { course(id: $id) { id title description thumbnailUrl estimatedHours isPublished instructorId modules { id title orderIndex contentItems { id title contentType duration orderIndex } } } }
`);

const SEARCH_SEMANTIC_BY_TEXT_QUERY_DOC = parse(`
  query SearchSemanticByText($query: String!, $limit: Int) { searchSemantic(query: $query, limit: $limit) { id text similarity entityType entityId } }
`);

const PRESIGNED_UPLOAD_QUERY_DOC = parse(`
  query GetPresignedUploadUrl($fileName: String!, $contentType: String!, $courseId: ID!) { getPresignedUploadUrl(fileName: $fileName, contentType: $contentType, courseId: $courseId) { uploadUrl fileKey expiresAt } }
`);

const CONFIRM_MEDIA_UPLOAD_MUTATION_DOC = parse(`
  mutation ConfirmMediaUpload($fileKey: String!, $courseId: ID!, $title: String!) { confirmMediaUpload(fileKey: $fileKey, courseId: $courseId, title: $title) { id courseId fileKey title contentType status downloadUrl hlsManifestUrl } }
`);

const CREATE_COURSE_MUTATION_DOC = parse(`
  mutation CreateCourse($input: CreateCourseInput!) { createCourse(input: $input) { id title slug description isPublished estimatedHours createdAt } }
`);

const ENROLL_COURSE_MUTATION_DOC = parse(`
  mutation EnrollCourse($courseId: ID!) { enrollCourse(courseId: $courseId) { id courseId userId status enrolledAt } }
`);

const UNENROLL_COURSE_MUTATION_DOC = parse(`
  mutation UnenrollCourse($courseId: ID!) { unenrollCourse(courseId: $courseId) }
`);

const MY_ENROLLMENTS_QUERY_DOC = parse(`
  query MyEnrollments { myEnrollments { id courseId userId status enrolledAt completedAt } }
`);

const MY_COURSE_PROGRESS_QUERY_DOC = parse(`
  query MyCourseProgress($courseId: ID!) { myCourseProgress(courseId: $courseId) { courseId totalItems completedItems percentComplete } }
`);

const MARK_CONTENT_VIEWED_MUTATION_DOC = parse(`
  mutation MarkContentViewed($contentItemId: ID!) { markContentViewed(contentItemId: $contentItemId) }
`);

// ---- knowledge.queries.ts
const CONCEPT_QUERY_DOC = parse(`
  query Concept($id: ID!) { concept(id: $id) { id name definition sourceIds createdAt } }
`);

const GET_CONCEPTS_QUERY_DOC = parse(`
  query GetConcepts($limit: Int) { concepts(limit: $limit) { id name definition sourceIds } }
`);

const GET_RELATED_CONCEPTS_QUERY_DOC = parse(`
  query GetRelatedConcepts($conceptId: ID!, $depth: Int, $limit: Int) { relatedConcepts(conceptId: $conceptId, depth: $depth, limit: $limit) { concept { id name definition } strength } }
`);

const CREATE_CONCEPT_MUTATION_DOC = parse(`
  mutation CreateConcept($input: CreateConceptInput!) { createConcept(input: $input) { id name definition } }
`);

const LINK_CONCEPTS_MUTATION_DOC = parse(`
  mutation LinkConcepts($fromId: ID!, $toId: ID!, $relationshipType: String!, $strength: Float) { linkConcepts(fromId: $fromId, toId: $toId, relationshipType: $relationshipType, strength: $strength) { fromConcept { id name } toConcept { id name } relationshipType strength } }
`);

const SEARCH_SEMANTIC_QUERY_DOC = parse(`
  query SearchSemantic($query: String!, $limit: Int) { searchSemantic(query: $query, limit: $limit) { id text similarity entityType entityId } }
`);

const LEARNING_PATH_QUERY_DOC = parse(`
  query LearningPath($from: String!, $to: String!) { learningPath(from: $from, to: $to) { concepts { id name type } steps } }
`);

const RELATED_CONCEPTS_BY_NAME_QUERY_DOC = parse(`
  query RelatedConceptsByName($conceptName: String!, $depth: Int) { relatedConceptsByName(conceptName: $conceptName, depth: $depth) { id name type } }
`);

const PREREQUISITE_CHAIN_QUERY_DOC = parse(`
  query PrerequisiteChain($conceptName: String!) { prerequisiteChain(conceptName: $conceptName) { id name } }
`);

// ---- agent.queries.ts
const START_AGENT_SESSION_MUTATION_DOC = parse(`
  mutation StartAgentSession($templateType: TemplateType!, $context: JSON!) { startAgentSession(templateType: $templateType, context: $context) { id templateType status createdAt } }
`);

const SEND_AGENT_MESSAGE_MUTATION_DOC = parse(`
  mutation SendAgentMessage($sessionId: ID!, $content: String!) { sendMessage(sessionId: $sessionId, content: $content) { id role content createdAt } }
`);

const END_SESSION_MUTATION_DOC = parse(`
  mutation EndAgentSession($sessionId: ID!) { endSession(sessionId: $sessionId) }
`);

const AGENT_SESSION_QUERY_DOC = parse(`
  query AgentSession($id: ID!) { agentSession(id: $id) { id templateType status messages { id role content createdAt } createdAt } }
`);

const MY_SESSIONS_QUERY_DOC = parse(`
  query MyAgentSessions { myAgentSessions { id templateType status createdAt messages { id content role } } }
`);

const AGENT_TEMPLATES_QUERY_DOC = parse(`
  query AgentTemplates { agentTemplates { id name templateType systemPrompt } }
`);

const MESSAGE_STREAM_SUBSCRIPTION_DOC = parse(`
  subscription MessageStream($sessionId: ID!) { messageStream(sessionId: $sessionId) { id role content createdAt } }
`);


describe('Schema Contract - annotation.queries.ts', () => {
  it('ANNOTATIONS_QUERY is valid', () => {
    assertValid('ANNOTATIONS_QUERY', ANNOTATIONS_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('MY_ANNOTATIONS_QUERY is valid', () => {
    assertValid('MY_ANNOTATIONS_QUERY', MY_ANNOTATIONS_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('REPLY_TO_ANNOTATION_MUTATION is valid', () => {
    assertValid('REPLY_TO_ANNOTATION_MUTATION', REPLY_TO_ANNOTATION_MUTATION_DOC);
    expect(true).toBe(true);
  });

});

describe('Schema Contract - annotation.mutations.ts', () => {
  it('CREATE_ANNOTATION_MUTATION is valid', () => {
    assertValid('CREATE_ANNOTATION_MUTATION', CREATE_ANNOTATION_MUTATION_DOC);
    expect(true).toBe(true);
  });

  it('UPDATE_ANNOTATION_MUTATION is valid', () => {
    assertValid('UPDATE_ANNOTATION_MUTATION', UPDATE_ANNOTATION_MUTATION_DOC);
    expect(true).toBe(true);
  });

  it('DELETE_ANNOTATION_MUTATION is valid', () => {
    assertValid('DELETE_ANNOTATION_MUTATION', DELETE_ANNOTATION_MUTATION_DOC);
    expect(true).toBe(true);
  });

  it('ANNOTATIONS_BY_ASSET_QUERY is valid', () => {
    assertValid('ANNOTATIONS_BY_ASSET_QUERY', ANNOTATIONS_BY_ASSET_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('ANNOTATION_ADDED_SUBSCRIPTION is valid', () => {
    assertValid('ANNOTATION_ADDED_SUBSCRIPTION', ANNOTATION_ADDED_SUBSCRIPTION_DOC);
    expect(true).toBe(true);
  });

});

describe('Schema Contract - content.queries.ts', () => {
  it('CONTENT_ITEM_QUERY is valid', () => {
    assertValid('CONTENT_ITEM_QUERY', CONTENT_ITEM_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('COURSE_CONTENTS_QUERY is valid', () => {
    assertValid('COURSE_CONTENTS_QUERY', COURSE_CONTENTS_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('COURSE_DETAIL_QUERY is valid', () => {
    assertValid('COURSE_DETAIL_QUERY', COURSE_DETAIL_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('SEARCH_SEMANTIC_BY_TEXT_QUERY is valid', () => {
    assertValid('SEARCH_SEMANTIC_BY_TEXT_QUERY', SEARCH_SEMANTIC_BY_TEXT_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('PRESIGNED_UPLOAD_QUERY is valid', () => {
    assertValid('PRESIGNED_UPLOAD_QUERY', PRESIGNED_UPLOAD_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('CONFIRM_MEDIA_UPLOAD_MUTATION is valid', () => {
    assertValid('CONFIRM_MEDIA_UPLOAD_MUTATION', CONFIRM_MEDIA_UPLOAD_MUTATION_DOC);
    expect(true).toBe(true);
  });

  it('CREATE_COURSE_MUTATION is valid', () => {
    assertValid('CREATE_COURSE_MUTATION', CREATE_COURSE_MUTATION_DOC);
    expect(true).toBe(true);
  });

  it('ENROLL_COURSE_MUTATION is valid', () => {
    assertValid('ENROLL_COURSE_MUTATION', ENROLL_COURSE_MUTATION_DOC);
    expect(true).toBe(true);
  });

  it('UNENROLL_COURSE_MUTATION is valid', () => {
    assertValid('UNENROLL_COURSE_MUTATION', UNENROLL_COURSE_MUTATION_DOC);
    expect(true).toBe(true);
  });

  it('MY_ENROLLMENTS_QUERY is valid', () => {
    assertValid('MY_ENROLLMENTS_QUERY', MY_ENROLLMENTS_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('MY_COURSE_PROGRESS_QUERY is valid', () => {
    assertValid('MY_COURSE_PROGRESS_QUERY', MY_COURSE_PROGRESS_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('MARK_CONTENT_VIEWED_MUTATION is valid', () => {
    assertValid('MARK_CONTENT_VIEWED_MUTATION', MARK_CONTENT_VIEWED_MUTATION_DOC);
    expect(true).toBe(true);
  });

});

describe('Schema Contract - knowledge.queries.ts', () => {
  it('CONCEPT_QUERY is valid', () => {
    assertValid('CONCEPT_QUERY', CONCEPT_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('GET_CONCEPTS_QUERY is valid', () => {
    assertValid('GET_CONCEPTS_QUERY', GET_CONCEPTS_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('GET_RELATED_CONCEPTS_QUERY is valid', () => {
    assertValid('GET_RELATED_CONCEPTS_QUERY', GET_RELATED_CONCEPTS_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('CREATE_CONCEPT_MUTATION is valid', () => {
    assertValid('CREATE_CONCEPT_MUTATION', CREATE_CONCEPT_MUTATION_DOC);
    expect(true).toBe(true);
  });

  it('LINK_CONCEPTS_MUTATION is valid', () => {
    assertValid('LINK_CONCEPTS_MUTATION', LINK_CONCEPTS_MUTATION_DOC);
    expect(true).toBe(true);
  });

  it('SEARCH_SEMANTIC_QUERY is valid', () => {
    assertValid('SEARCH_SEMANTIC_QUERY', SEARCH_SEMANTIC_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('LEARNING_PATH_QUERY is valid', () => {
    assertValid('LEARNING_PATH_QUERY', LEARNING_PATH_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('RELATED_CONCEPTS_BY_NAME_QUERY is valid', () => {
    assertValid('RELATED_CONCEPTS_BY_NAME_QUERY', RELATED_CONCEPTS_BY_NAME_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('PREREQUISITE_CHAIN_QUERY is valid', () => {
    assertValid('PREREQUISITE_CHAIN_QUERY', PREREQUISITE_CHAIN_QUERY_DOC);
    expect(true).toBe(true);
  });

});

describe('Schema Contract - agent.queries.ts', () => {
  it('START_AGENT_SESSION_MUTATION is valid', () => {
    assertValid('START_AGENT_SESSION_MUTATION', START_AGENT_SESSION_MUTATION_DOC);
    expect(true).toBe(true);
  });

  it('SEND_AGENT_MESSAGE_MUTATION is valid', () => {
    assertValid('SEND_AGENT_MESSAGE_MUTATION', SEND_AGENT_MESSAGE_MUTATION_DOC);
    expect(true).toBe(true);
  });

  it('END_SESSION_MUTATION is valid', () => {
    assertValid('END_SESSION_MUTATION', END_SESSION_MUTATION_DOC);
    expect(true).toBe(true);
  });

  it('AGENT_SESSION_QUERY is valid', () => {
    assertValid('AGENT_SESSION_QUERY', AGENT_SESSION_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('MY_SESSIONS_QUERY is valid', () => {
    assertValid('MY_SESSIONS_QUERY', MY_SESSIONS_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('AGENT_TEMPLATES_QUERY is valid', () => {
    assertValid('AGENT_TEMPLATES_QUERY', AGENT_TEMPLATES_QUERY_DOC);
    expect(true).toBe(true);
  });

  it('MESSAGE_STREAM_SUBSCRIPTION is valid', () => {
    assertValid('MESSAGE_STREAM_SUBSCRIPTION', MESSAGE_STREAM_SUBSCRIPTION_DOC);
    expect(true).toBe(true);
  });

});
