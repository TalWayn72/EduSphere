/**
 * GraphPersonTermService — Person, Term, Source, TopicCluster, and Learning Path operations.
 * Wraps CypherService calls inside withTenantContext (RLS enforcement).
 */
import { Injectable, Logger } from '@nestjs/common';
import { db, withTenantContext } from '@edusphere/db';
import { CypherPersonService } from './cypher-person.service';
import { CypherTermService } from './cypher-term.service';
import { CypherSourceService } from './cypher-source.service';
import { CypherTopicClusterService } from './cypher-topic-cluster.service';
import { CypherLearningPathService } from './cypher-learning-path.service';
import { toUserRole } from './graph-types';

@Injectable()
export class GraphPersonTermService {
  private readonly logger = new Logger(GraphPersonTermService.name);

  constructor(
    private readonly person: CypherPersonService,
    private readonly term: CypherTermService,
    private readonly source: CypherSourceService,
    private readonly topicCluster: CypherTopicClusterService,
    private readonly learningPath: CypherLearningPathService
  ) {}

  // ── Person ─────────────────────────────────────────────────────────────────
  async findPersonById(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => this.person.findPersonById(id, tenantId)
    );
  }

  async findPersonByName(
    name: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => this.person.findPersonByName(name, tenantId)
    );
  }

  async createPerson(
    name: string,
    bio: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => this.person.createPerson(name, bio, tenantId)
    );
  }

  // ── Term ───────────────────────────────────────────────────────────────────
  async findTermById(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => this.term.findTermById(id, tenantId)
    );
  }

  async findTermByName(
    name: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => this.term.findTermByName(name, tenantId)
    );
  }

  async createTerm(
    name: string,
    definition: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => this.term.createTerm(name, definition, tenantId)
    );
  }

  // ── Source ─────────────────────────────────────────────────────────────────
  async findSourceById(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => this.source.findSourceById(id, tenantId)
    );
  }

  async createSource(
    title: string,
    type: string,
    url: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => this.source.createSource(title, type, url, tenantId)
    );
  }

  // ── TopicCluster ───────────────────────────────────────────────────────────
  async findTopicClusterById(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => this.topicCluster.findTopicClusterById(id, tenantId)
    );
  }

  async findTopicClustersByCourse(
    courseId: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () =>
        this.topicCluster.findTopicClustersByCourse(courseId, tenantId)
    );
  }

  async createTopicCluster(
    name: string,
    description: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () =>
        this.topicCluster.createTopicCluster(name, description, tenantId)
    );
  }

  // ── Learning Paths ─────────────────────────────────────────────────────────
  async getLearningPath(
    from: string,
    to: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => {
        this.logger.debug({ from, to, tenantId }, 'getLearningPath called');
        return this.learningPath.findShortestLearningPath(from, to, tenantId);
      }
    );
  }

  async getRelatedConceptsByName(
    conceptName: string,
    depth: number,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => {
        this.logger.debug(
          { conceptName, depth, tenantId },
          'getRelatedConceptsByName called'
        );
        return this.learningPath.collectRelatedConcepts(
          conceptName,
          depth,
          tenantId
        );
      }
    );
  }

  async getPrerequisiteChain(
    conceptName: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => {
        this.logger.debug(
          { conceptName, tenantId },
          'getPrerequisiteChain called'
        );
        return this.learningPath.findPrerequisiteChain(conceptName, tenantId);
      }
    );
  }
}
