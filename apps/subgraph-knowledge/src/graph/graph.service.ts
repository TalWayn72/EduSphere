/**
 * GraphService — thin facade that delegates to the three focused sub-services.
 *
 * Concept operations   → GraphConceptService
 * Search / embeddings  → GraphSearchService
 * Person / Term / etc. → GraphPersonTermService
 *
 * graph.resolver.ts calls this facade and is completely unaware of the split.
 * No `role as any` casts — all role coercion is handled inside each sub-service
 * via `toUserRole()` from graph-types.ts.
 */
import { Injectable } from '@nestjs/common';
import { GraphConceptService } from './graph-concept.service';
import { GraphSearchService } from './graph-search.service';
import { GraphPersonTermService } from './graph-person-term.service';

@Injectable()
export class GraphService {
  constructor(
    private readonly concept: GraphConceptService,
    private readonly search: GraphSearchService,
    private readonly personTerm: GraphPersonTermService
  ) {}

  // ── Concept ──────────────────────────────────────────────────────────────
  findConceptById(id: string, tenantId: string, userId: string, role: string) {
    return this.concept.findConceptById(id, tenantId, userId, role);
  }

  findConceptByName(
    name: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.concept.findConceptByName(name, tenantId, userId, role);
  }

  findAllConcepts(
    tenantId: string,
    userId: string,
    role: string,
    limit?: number
  ) {
    return this.concept.findAllConcepts(tenantId, userId, role, limit);
  }

  createConcept(
    name: string,
    definition: string,
    sourceIds: string[] = [],
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.concept.createConcept(
      name,
      definition,
      sourceIds,
      tenantId,
      userId,
      role
    );
  }

  updateConcept(
    id: string,
    updates: { name?: string; definition?: string; sourceIds?: string[] },
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.concept.updateConcept(id, updates, tenantId, userId, role);
  }

  deleteConcept(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ): Promise<boolean> {
    return this.concept.deleteConcept(id, tenantId, userId, role);
  }

  findRelatedConcepts(
    conceptId: string,
    depth: number,
    limit: number,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.concept.findRelatedConcepts(
      conceptId,
      depth,
      limit,
      tenantId,
      userId,
      role
    );
  }

  linkConcepts(
    fromId: string,
    toId: string,
    relationshipType: string,
    strength: number | null,
    description: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.concept.linkConcepts(
      fromId,
      toId,
      relationshipType,
      strength,
      description,
      tenantId,
      userId,
      role
    );
  }

  // ── Search / Embeddings ──────────────────────────────────────────────────
  semanticSearch(
    query: string,
    limit: number,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.search.semanticSearch(query, limit, tenantId, userId, role);
  }

  generateEmbedding(
    text: string,
    entityType: string,
    entityId: string,
    tenantId: string,
    userId: string,
    role: string
  ): Promise<boolean> {
    return this.search.generateEmbedding(
      text,
      entityType,
      entityId,
      tenantId,
      userId,
      role
    );
  }

  // ── Person ───────────────────────────────────────────────────────────────
  findPersonById(id: string, tenantId: string, userId: string, role: string) {
    return this.personTerm.findPersonById(id, tenantId, userId, role);
  }

  findPersonByName(
    name: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.personTerm.findPersonByName(name, tenantId, userId, role);
  }

  createPerson(
    name: string,
    bio: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.personTerm.createPerson(name, bio, tenantId, userId, role);
  }

  // ── Term ─────────────────────────────────────────────────────────────────
  findTermById(id: string, tenantId: string, userId: string, role: string) {
    return this.personTerm.findTermById(id, tenantId, userId, role);
  }

  findTermByName(name: string, tenantId: string, userId: string, role: string) {
    return this.personTerm.findTermByName(name, tenantId, userId, role);
  }

  createTerm(
    name: string,
    definition: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.personTerm.createTerm(name, definition, tenantId, userId, role);
  }

  // ── Source ───────────────────────────────────────────────────────────────
  findSourceById(id: string, tenantId: string, userId: string, role: string) {
    return this.personTerm.findSourceById(id, tenantId, userId, role);
  }

  createSource(
    title: string,
    type: string,
    url: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.personTerm.createSource(
      title,
      type,
      url,
      tenantId,
      userId,
      role
    );
  }

  // ── TopicCluster ─────────────────────────────────────────────────────────
  findTopicClusterById(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.personTerm.findTopicClusterById(id, tenantId, userId, role);
  }

  findTopicClustersByCourse(
    courseId: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.personTerm.findTopicClustersByCourse(
      courseId,
      tenantId,
      userId,
      role
    );
  }

  createTopicCluster(
    name: string,
    description: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.personTerm.createTopicCluster(
      name,
      description,
      tenantId,
      userId,
      role
    );
  }

  // ── Learning Paths ────────────────────────────────────────────────────────
  getLearningPath(
    from: string,
    to: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.personTerm.getLearningPath(from, to, tenantId, userId, role);
  }

  getRelatedConceptsByName(
    conceptName: string,
    depth: number,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.personTerm.getRelatedConceptsByName(
      conceptName,
      depth,
      tenantId,
      userId,
      role
    );
  }

  getPrerequisiteChain(
    conceptName: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.personTerm.getPrerequisiteChain(
      conceptName,
      tenantId,
      userId,
      role
    );
  }
}
