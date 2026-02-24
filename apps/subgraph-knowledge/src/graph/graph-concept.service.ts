/**
 * GraphConceptService — business-logic layer for Concept graph operations.
 * Wraps CypherConceptService calls inside withTenantContext (RLS enforcement).
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db, withTenantContext } from '@edusphere/db';
import { CypherConceptService } from './cypher-concept.service';
import { toUserRole, type GraphConceptNode, type RelatedConceptRow } from './graph-types';
import { DEFAULT_CONCEPT_LIMIT } from '../constants';

@Injectable()
export class GraphConceptService {
  private readonly logger = new Logger(GraphConceptService.name);

  constructor(private readonly cypher: CypherConceptService) {}

  private mapConcept(node: GraphConceptNode) {
    return {
      id: node.id,
      tenantId: node.tenant_id,
      name: node.name,
      definition: node.definition,
      sourceIds: JSON.parse(node.source_ids || '[]') as string[],
      createdAt: new Date(node.created_at).toISOString(),
      updatedAt: new Date(node.updated_at).toISOString(),
    };
  }

  async findConceptById(id: string, tenantId: string, userId: string, role: string) {
    return withTenantContext(db, { tenantId, userId, userRole: toUserRole(role) }, async () => {
      const concept = await this.cypher.findConceptById(id, tenantId);
      if (!concept) throw new NotFoundException(`Concept with ID ${id} not found`);
      return this.mapConcept(concept as GraphConceptNode);
    });
  }

  async findConceptByName(name: string, tenantId: string, userId: string, role: string) {
    return withTenantContext(db, { tenantId, userId, userRole: toUserRole(role) }, async () => {
      const concept = await this.cypher.findConceptByName(name, tenantId);
      if (!concept) throw new NotFoundException(`Concept with name "${name}" not found`);
      return this.mapConcept(concept as GraphConceptNode);
    });
  }

  async findAllConcepts(
    tenantId: string, userId: string, role: string, limit: number = DEFAULT_CONCEPT_LIMIT
  ) {
    return withTenantContext(db, { tenantId, userId, userRole: toUserRole(role) }, async () => {
      const concepts = await this.cypher.findAllConcepts(tenantId, limit);
      return (concepts as GraphConceptNode[]).map((c) => this.mapConcept(c));
    });
  }

  async createConcept(
    name: string, definition: string, sourceIds: string[] = [],
    tenantId: string, userId: string, role: string
  ) {
    return withTenantContext(db, { tenantId, userId, userRole: toUserRole(role) }, async () => {
      const conceptId = await this.cypher.createConcept({ tenant_id: tenantId, name, definition, source_ids: sourceIds });
      const concept = await this.cypher.findConceptById(conceptId, tenantId);
      if (!concept) throw new NotFoundException('Failed to create concept');
      return this.mapConcept(concept as GraphConceptNode);
    });
  }

  async updateConcept(
    id: string,
    updates: { name?: string; definition?: string; sourceIds?: string[] },
    tenantId: string, userId: string, role: string
  ) {
    return withTenantContext(db, { tenantId, userId, userRole: toUserRole(role) }, async () => {
      const mapped: Record<string, string> = {};
      if (updates.name) mapped.name = updates.name;
      if (updates.definition) mapped.definition = updates.definition;
      if (updates.sourceIds) mapped.source_ids = JSON.stringify(updates.sourceIds);
      const concept = await this.cypher.updateConcept(id, tenantId, mapped);
      if (!concept) throw new NotFoundException(`Concept with ID ${id} not found`);
      return this.mapConcept(concept as GraphConceptNode);
    });
  }

  async deleteConcept(id: string, tenantId: string, userId: string, role: string): Promise<boolean> {
    return withTenantContext(db, { tenantId, userId, userRole: toUserRole(role) }, async () =>
      this.cypher.deleteConcept(id, tenantId)
    );
  }

  async findRelatedConcepts(
    conceptId: string, depth: number, limit: number,
    tenantId: string, userId: string, role: string
  ) {
    return withTenantContext(db, { tenantId, userId, userRole: toUserRole(role) }, async () => {
      const related = await this.cypher.findRelatedConcepts(conceptId, tenantId, depth, limit);
      return (related as RelatedConceptRow[]).map((r) => ({
        concept: this.mapConcept(r),
        strength: r.strength ?? 1.0,
      }));
    });
  }

  async linkConcepts(
    fromId: string, toId: string, relationshipType: string,
    strength: number | null, description: string | null,
    tenantId: string, userId: string, role: string
  ) {
    return withTenantContext(db, { tenantId, userId, userRole: toUserRole(role) }, async () => {
      await this.cypher.linkConcepts(fromId, toId, relationshipType, {
        strength: strength ?? undefined,
        description: description ?? undefined,
      });
      const fromConcept = await this.cypher.findConceptById(fromId, tenantId);
      const toConcept = await this.cypher.findConceptById(toId, tenantId);
      return {
        fromConcept: fromConcept ? this.mapConcept(fromConcept as GraphConceptNode) : null,
        toConcept: toConcept ? this.mapConcept(toConcept as GraphConceptNode) : null,
        relationshipType,
        strength,
        inferred: false,
        description,
      };
    });
  }
}
