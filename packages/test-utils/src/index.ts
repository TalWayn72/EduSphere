// Factories
export {
  TENANT_A,
  TENANT_B,
  createTenantContext,
  createAuthContext,
} from './factories/tenant.factory.js';
export type { TenantContext, AuthContext } from './factories/tenant.factory.js';

export {
  createUser,
  createStudentContext,
  createInstructorContext,
  createAdminContext,
} from './factories/user.factory.js';
export type { UserRecord } from './factories/user.factory.js';

export {
  createCourse,
  createCourseModule,
  createContentItem,
} from './factories/course.factory.js';
export type {
  Course,
  CourseModule,
  ContentItem,
} from './factories/course.factory.js';

export {
  createAnnotation,
  createAnnotationInput,
} from './factories/annotation.factory.js';
export type {
  Annotation,
  AnnotationInput,
  AnnotationLayer,
} from './factories/annotation.factory.js';

export {
  createConcept,
  createTerm,
  createPerson,
} from './factories/knowledge.factory.js';
export type {
  ConceptNode,
  TermNode,
  PersonNode,
} from './factories/knowledge.factory.js';

export {
  createAgentSession,
  createAgentMessage,
} from './factories/agent-session.factory.js';
export type {
  AgentSession,
  AgentMessage,
  AgentSessionStatus,
} from './factories/agent-session.factory.js';

// Mocks
export { createMockDb, createMockWithTenantContext } from './mocks/db.mock.js';
export type { MockDb, MockDbChain } from './mocks/db.mock.js';

export {
  createMockNatsClient,
  createMockKVStore,
  createMockNatsKVClient,
} from './mocks/nats.mock.js';
export type {
  MockNatsClient,
  MockKVStore,
  MockNatsKVClient,
} from './mocks/nats.mock.js';

export { createMockLogger } from './mocks/logger.mock.js';
export type { MockLogger } from './mocks/logger.mock.js';

export {
  createMockJwtPayload,
  createMockAuthContext,
  mockJwt,
  createMockJwtValidator,
} from './mocks/auth.mock.js';
export type {
  MockJwtPayload,
  MockAuthContext,
  MockJwtValidator,
} from './mocks/auth.mock.js';
