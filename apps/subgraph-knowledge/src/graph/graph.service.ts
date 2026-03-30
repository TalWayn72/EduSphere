/**
 * GraphService — thin facade that delegates to query and mutation sub-facades.
 *
 * Query methods   → GraphQueryFacadeService
 * Mutation methods → GraphMutationFacadeService
 *
 * graph.resolver.ts calls this facade without knowledge of the split.
 */
import { Injectable } from '@nestjs/common';
import type { ConceptRelationshipType } from '@edusphere/db';
import { GraphQueryFacadeService } from './graph-query-facade.service';
import { GraphMutationFacadeService } from './graph-mutation-facade.service';

@Injectable()
export class GraphService {
  constructor(
    private readonly queries: GraphQueryFacadeService,
    private readonly mutations: GraphMutationFacadeService
  ) {}

  // ── Concept CRUD ──────────────────────────────────────────────────────
  findConceptById(id: string, tenantId: string, userId: string, role: string) {
    return this.queries.findConceptById(id, tenantId, userId, role);
  }

  findConceptByName(name: string, tenantId: string, userId: string, role: string) {
    return this.queries.findConceptByName(name, tenantId, userId, role);
  }

  findAllConcepts(tenantId: string, userId: string, role: string, limit?: number) {
    return this.queries.findAllConcepts(tenantId, userId, role, limit);
  }

  createConcept(
    name: string, definition: string, sourceIds: string[] = [],
    tenantId: string, userId: string, role: string
  ) {
    return this.mutations.createConcept(name, definition, sourceIds, tenantId, userId, role);
  }

  updateConcept(
    id: string, updates: { name?: string; definition?: string; sourceIds?: string[] },
    tenantId: string, userId: string, role: string
  ) {
    return this.mutations.updateConcept(id, updates, tenantId, userId, role);
  }

  deleteConcept(id: string, tenantId: string, userId: string, role: string): Promise<boolean> {
    return this.mutations.deleteConcept(id, tenantId, userId, role);
  }

  // ── Concept Relations ─────────────────────────────────────────────────
  findRelatedConcepts(
    conceptId: string, depth: number, limit: number,
    tenantId: string, userId: string, role: string
  ) {
    return this.queries.findRelatedConcepts(conceptId, depth, limit, tenantId, userId, role);
  }

  linkConcepts(
    fromId: string, toId: string, relationshipType: ConceptRelationshipType,
    strength: number | null, description: string | null,
    tenantId: string, userId: string, role: string
  ) {
    return this.mutations.linkConcepts(
      fromId, toId, relationshipType, strength, description, tenantId, userId, role
    );
  }

  // ── Search / Embeddings ───────────────────────────────────────────────
  semanticSearch(query: string, limit: number, tenantId: string, userId: string, role: string) {
    return this.queries.semanticSearch(query, limit, tenantId, userId, role);
  }

  generateEmbedding(
    text: string, entityType: string, entityId: string,
    tenantId: string, userId: string, role: string
  ): Promise<boolean> {
    return this.mutations.generateEmbedding(text, entityType, entityId, tenantId, userId, role);
  }

  // ── Person ────────────────────────────────────────────────────────────
  findPersonById(id: string, tenantId: string, userId: string, role: string) {
    return this.queries.findPersonById(id, tenantId, userId, role);
  }

  findPersonByName(name: string, tenantId: string, userId: string, role: string) {
    return this.queries.findPersonByName(name, tenantId, userId, role);
  }

  createPerson(name: string, bio: string | null, tenantId: string, userId: string, role: string) {
    return this.mutations.createPerson(name, bio, tenantId, userId, role);
  }

  // ── Term ──────────────────────────────────────────────────────────────
  findTermById(id: string, tenantId: string, userId: string, role: string) {
    return this.queries.findTermById(id, tenantId, userId, role);
  }

  findTermByName(name: string, tenantId: string, userId: string, role: string) {
    return this.queries.findTermByName(name, tenantId, userId, role);
  }

  createTerm(name: string, definition: string, tenantId: string, userId: string, role: string) {
    return this.mutations.createTerm(name, definition, tenantId, userId, role);
  }

  // ── Source ────────────────────────────────────────────────────────────
  findSourceById(id: string, tenantId: string, userId: string, role: string) {
    return this.queries.findSourceById(id, tenantId, userId, role);
  }

  createSource(
    title: string, type: string, url: string | null,
    tenantId: string, userId: string, role: string
  ) {
    return this.mutations.createSource(title, type, url, tenantId, userId, role);
  }

  // ── TopicCluster ──────────────────────────────────────────────────────
  findTopicClusterById(id: string, tenantId: string, userId: string, role: string) {
    return this.queries.findTopicClusterById(id, tenantId, userId, role);
  }

  findTopicClustersByCourse(courseId: string, tenantId: string, userId: string, role: string) {
    return this.queries.findTopicClustersByCourse(courseId, tenantId, userId, role);
  }

  createTopicCluster(
    name: string, description: string | null,
    tenantId: string, userId: string, role: string
  ) {
    return this.mutations.createTopicCluster(name, description, tenantId, userId, role);
  }

  // ── Learning Paths ────────────────────────────────────────────────────
  getLearningPath(from: string, to: string, tenantId: string, userId: string, role: string) {
    return this.queries.getLearningPath(from, to, tenantId, userId, role);
  }

  getRelatedConceptsByName(
    conceptName: string, depth: number, tenantId: string, userId: string, role: string
  ) {
    return this.queries.getRelatedConceptsByName(conceptName, depth, tenantId, userId, role);
  }

  getPrerequisiteChain(conceptName: string, tenantId: string, userId: string, role: string) {
    return this.queries.getPrerequisiteChain(conceptName, tenantId, userId, role);
  }
}
