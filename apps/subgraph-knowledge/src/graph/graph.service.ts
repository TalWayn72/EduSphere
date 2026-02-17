import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db, withTenantContext } from '@edusphere/db';
import { CypherService } from './cypher.service';

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);

  constructor(private readonly cypherService: CypherService) {}

  async findConceptById(id: string, tenantId: string, userId: string, role: string) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      const concept = await this.cypherService.findConceptById(id, tenantId);
      if (!concept) {
        throw new NotFoundException(`Concept with ID ${id} not found`);
      }
      return this.mapConceptFromGraph(concept);
    });
  }

  async findConceptByName(name: string, tenantId: string, userId: string, role: string) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      const concept = await this.cypherService.findConceptByName(name, tenantId);
      if (!concept) {
        throw new NotFoundException(`Concept with name "${name}" not found`);
      }
      return this.mapConceptFromGraph(concept);
    });
  }

  async findAllConcepts(tenantId: string, userId: string, role: string, limit: number = 20) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      const concepts = await this.cypherService.findAllConcepts(tenantId, limit);
      return concepts.map((c) => this.mapConceptFromGraph(c));
    });
  }

  async createConcept(
    name: string,
    definition: string,
    sourceIds: string[] = [],
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      const conceptId = await this.cypherService.createConcept({
        tenant_id: tenantId,
        name,
        definition,
        source_ids: sourceIds,
      });
      const concept = await this.cypherService.findConceptById(conceptId, tenantId);
      if (!concept) {
        throw new NotFoundException(`Failed to create concept`);
      }
      return this.mapConceptFromGraph(concept);
    });
  }

  async updateConcept(
    id: string,
    updates: { name?: string; definition?: string; sourceIds?: string[] },
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      const mappedUpdates: any = {};
      if (updates.name) mappedUpdates.name = updates.name;
      if (updates.definition) mappedUpdates.definition = updates.definition;
      if (updates.sourceIds) mappedUpdates.source_ids = JSON.stringify(updates.sourceIds);

      const concept = await this.cypherService.updateConcept(id, tenantId, mappedUpdates);
      if (!concept) {
        throw new NotFoundException(`Concept with ID ${id} not found`);
      }
      return this.mapConceptFromGraph(concept);
    });
  }

  async deleteConcept(id: string, tenantId: string, userId: string, role: string): Promise<boolean> {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      return this.cypherService.deleteConcept(id, tenantId);
    });
  }

  async findRelatedConcepts(
    conceptId: string,
    depth: number,
    limit: number,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      const related = await this.cypherService.findRelatedConcepts(conceptId, tenantId, depth, limit);
      return related.map((r: any) => ({
        concept: this.mapConceptFromGraph(r),
        strength: r.strength || 1.0,
      }));
    });
  }

  async linkConcepts(
    fromId: string,
    toId: string,
    relationshipType: string,
    strength: number | null,
    description: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      await this.cypherService.linkConcepts(fromId, toId, relationshipType, {
        strength: strength ?? undefined,
        description: description ?? undefined,
      });

      const fromConcept = await this.cypherService.findConceptById(fromId, tenantId);
      const toConcept = await this.cypherService.findConceptById(toId, tenantId);

      return {
        fromConcept: fromConcept ? this.mapConceptFromGraph(fromConcept) : null,
        toConcept: toConcept ? this.mapConceptFromGraph(toConcept) : null,
        relationshipType,
        strength,
        inferred: false,
        description,
      };
    });
  }

  async semanticSearch(query: string, limit: number, tenantId: string, userId: string, role: string) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      this.logger.warn('Semantic search not fully implemented - requires embedding generation');
      return [];
    });
  }

  async generateEmbedding(
    text: string,
    entityType: string,
    entityId: string,
    tenantId: string,
    userId: string,
    role: string
  ): Promise<boolean> {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      this.logger.warn('Embedding generation not implemented - requires AI service integration');
      return false;
    });
  }

  private mapConceptFromGraph(graphNode: any): any {
    return {
      id: graphNode.id,
      tenantId: graphNode.tenant_id,
      name: graphNode.name,
      definition: graphNode.definition,
      sourceIds: JSON.parse(graphNode.source_ids || '[]'),
      createdAt: new Date(graphNode.created_at).toISOString(),
      updatedAt: new Date(graphNode.updated_at).toISOString(),
    };
  }

  async findPersonById(id: string, tenantId: string, userId: string, role: string) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      return this.cypherService.findPersonById(id, tenantId);
    });
  }

  async findPersonByName(name: string, tenantId: string, userId: string, role: string) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      return this.cypherService.findPersonByName(name, tenantId);
    });
  }

  async createPerson(name: string, bio: string | null, tenantId: string, userId: string, role: string) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      return this.cypherService.createPerson(name, bio, tenantId);
    });
  }

  async findTermById(id: string, tenantId: string, userId: string, role: string) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      return this.cypherService.findTermById(id, tenantId);
    });
  }

  async findTermByName(name: string, tenantId: string, userId: string, role: string) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      return this.cypherService.findTermByName(name, tenantId);
    });
  }

  async createTerm(name: string, definition: string, tenantId: string, userId: string, role: string) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      return this.cypherService.createTerm(name, definition, tenantId);
    });
  }

  async findSourceById(id: string, tenantId: string, userId: string, role: string) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      return this.cypherService.findSourceById(id, tenantId);
    });
  }

  async createSource(
    title: string,
    type: string,
    url: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      return this.cypherService.createSource(title, type, url, tenantId);
    });
  }

  async findTopicClusterById(id: string, tenantId: string, userId: string, role: string) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      return this.cypherService.findTopicClusterById(id, tenantId);
    });
  }

  async findTopicClustersByCourse(courseId: string, tenantId: string, userId: string, role: string) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      return this.cypherService.findTopicClustersByCourse(courseId, tenantId);
    });
  }

  async createTopicCluster(
    name: string,
    description: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(db, { tenantId, userId, userRole: role as any }, async () => {
      return this.cypherService.createTopicCluster(name, description, tenantId);
    });
  }
}
