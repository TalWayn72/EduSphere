/**
 * GraphConceptService — business-logic layer for Concept CRUD graph operations.
 * Wraps CypherConceptService calls inside withTenantContext (RLS enforcement).
 *
 * Relation operations (findRelatedConcepts, linkConcepts) live in
 * GraphConceptLinkService.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db, withTenantContext } from '@edusphere/db';
import { CypherConceptService } from './cypher-concept.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { toUserRole, safeIsoDate, type GraphConceptNode } from './graph-types';
import { DEFAULT_CONCEPT_LIMIT } from '../constants';

@Injectable()
export class GraphConceptService {
  private readonly logger = new Logger(GraphConceptService.name);

  constructor(
    private readonly cypher: CypherConceptService,
    private readonly embeddingService: EmbeddingService
  ) {}

  mapConcept(node: GraphConceptNode) {
    return {
      // BUG-FIX: Provide safe fallbacks for all non-nullable SDL fields.
      // Apache AGE may omit optional vertex properties when they are absent,
      // returning undefined. Without fallbacks the resolver returns null for
      // String!/ID! fields, causing a GraphQL non-nullable violation error.
      id: node.id ?? '',
      tenantId: node.tenant_id ?? '',
      name: node.name ?? '',
      definition: node.definition ?? '',
      sourceIds: JSON.parse(node.source_ids || '[]') as string[],
      createdAt: safeIsoDate(node.created_at),
      updatedAt: safeIsoDate(node.updated_at),
    };
  }

  async findConceptById(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => {
        const concept = await this.cypher.findConceptById(id, tenantId);
        if (!concept)
          throw new NotFoundException(`Concept with ID ${id} not found`);
        return this.mapConcept(concept as GraphConceptNode);
      }
    );
  }

  async findConceptByName(
    name: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => {
        const concept = await this.cypher.findConceptByName(name, tenantId);
        if (!concept)
          throw new NotFoundException(`Concept with name "${name}" not found`);
        return this.mapConcept(concept as GraphConceptNode);
      }
    );
  }

  async findAllConcepts(
    tenantId: string,
    userId: string,
    role: string,
    limit: number = DEFAULT_CONCEPT_LIMIT
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => {
        const concepts = await this.cypher.findAllConcepts(tenantId, limit);
        return (concepts as GraphConceptNode[]).map((c) => this.mapConcept(c));
      }
    );
  }

  async createConcept(
    name: string,
    definition: string,
    sourceIds: string[] = [],
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => {
        const conceptId = await this.cypher.createConcept({
          tenant_id: tenantId,
          name,
          definition,
          source_ids: sourceIds,
        });
        const concept = await this.cypher.findConceptById(conceptId, tenantId);
        if (!concept) throw new NotFoundException('Failed to create concept');
        return this.mapConcept(concept as GraphConceptNode);
      }
    );
  }

  async updateConcept(
    id: string,
    updates: { name?: string; definition?: string; sourceIds?: string[] },
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => {
        const mapped: Record<string, string> = {};
        if (updates.name) mapped.name = updates.name;
        if (updates.definition) mapped.definition = updates.definition;
        if (updates.sourceIds)
          mapped.source_ids = JSON.stringify(updates.sourceIds);
        const concept = await this.cypher.updateConcept(id, tenantId, mapped);
        if (!concept)
          throw new NotFoundException(`Concept with ID ${id} not found`);
        return this.mapConcept(concept as GraphConceptNode);
      }
    );
  }

  async deleteConcept(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ): Promise<boolean> {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => {
        const deleted = await this.cypher.deleteConcept(id, tenantId);
        if (deleted) {
          try {
            const count = await this.embeddingService.deleteByConceptId(id);
            if (count > 0) {
              this.logger.log(
                { conceptId: id, tenantId, embeddingsDeleted: count },
                'Cascade-deleted orphaned concept embeddings'
              );
            }
          } catch (err) {
            this.logger.error(
              { err, conceptId: id, tenantId },
              'Failed to cascade-delete concept embeddings — orphans may remain'
            );
          }
        }
        return deleted;
      }
    );
  }
}
