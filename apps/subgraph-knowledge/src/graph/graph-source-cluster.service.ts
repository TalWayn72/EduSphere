/**
 * GraphSourceClusterService — Source, TopicCluster, and Learning Path operations.
 * Wraps Cypher service calls inside withTenantContext (RLS enforcement).
 *
 * Person and Term operations live in GraphPersonTermService.
 */
import { Injectable, Logger } from '@nestjs/common';
import { db, withTenantContext } from '@edusphere/db';
import { CypherSourceService } from './cypher-source.service';
import { CypherTopicClusterService } from './cypher-topic-cluster.service';
import { CypherLearningPathService } from './cypher-learning-path.service';
import { toUserRole } from './graph-types';

@Injectable()
export class GraphSourceClusterService {
  private readonly logger = new Logger(GraphSourceClusterService.name);

  constructor(
    private readonly source: CypherSourceService,
    private readonly topicCluster: CypherTopicClusterService,
    private readonly learningPath: CypherLearningPathService
  ) {}

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
