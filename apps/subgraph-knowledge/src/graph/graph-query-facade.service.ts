/**
 * GraphQueryFacadeService — Read-only facade methods for graph queries.
 * Delegates to focused sub-services: Concept, ConceptLink, Search,
 * PersonTerm, SourceCluster.
 * Extracted from GraphService to keep files under 300 lines.
 */
import { Injectable } from '@nestjs/common';
import { GraphConceptService } from './graph-concept.service';
import { GraphConceptLinkService } from './graph-concept-link.service';
import { GraphSearchService } from './graph-search.service';
import { GraphPersonTermService } from './graph-person-term.service';
import { GraphSourceClusterService } from './graph-source-cluster.service';

@Injectable()
export class GraphQueryFacadeService {
  constructor(
    private readonly concept: GraphConceptService,
    private readonly conceptLink: GraphConceptLinkService,
    private readonly search: GraphSearchService,
    private readonly personTerm: GraphPersonTermService,
    private readonly sourceCluster: GraphSourceClusterService
  ) {}

  // ── Concept Queries ─────────────────────────────────────────────────────
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

  // ── Concept Relations ─────────────────────────────────────────────────
  findRelatedConcepts(
    conceptId: string,
    depth: number,
    limit: number,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.conceptLink.findRelatedConcepts(
      conceptId,
      depth,
      limit,
      tenantId,
      userId,
      role
    );
  }

  // ── Search / Embeddings ───────────────────────────────────────────────
  semanticSearch(
    query: string,
    limit: number,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.search.semanticSearch(query, limit, tenantId, userId, role);
  }

  // ── Person ────────────────────────────────────────────────────────────
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

  // ── Term ──────────────────────────────────────────────────────────────
  findTermById(id: string, tenantId: string, userId: string, role: string) {
    return this.personTerm.findTermById(id, tenantId, userId, role);
  }

  findTermByName(name: string, tenantId: string, userId: string, role: string) {
    return this.personTerm.findTermByName(name, tenantId, userId, role);
  }

  // ── Source ────────────────────────────────────────────────────────────
  findSourceById(id: string, tenantId: string, userId: string, role: string) {
    return this.sourceCluster.findSourceById(id, tenantId, userId, role);
  }

  // ── TopicCluster ──────────────────────────────────────────────────────
  findTopicClusterById(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.sourceCluster.findTopicClusterById(id, tenantId, userId, role);
  }

  findTopicClustersByCourse(
    courseId: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.sourceCluster.findTopicClustersByCourse(
      courseId,
      tenantId,
      userId,
      role
    );
  }

  // ── Learning Paths ────────────────────────────────────────────────────
  getLearningPath(
    from: string,
    to: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.sourceCluster.getLearningPath(
      from,
      to,
      tenantId,
      userId,
      role
    );
  }

  getRelatedConceptsByName(
    conceptName: string,
    depth: number,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.sourceCluster.getRelatedConceptsByName(
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
    return this.sourceCluster.getPrerequisiteChain(
      conceptName,
      tenantId,
      userId,
      role
    );
  }
}
