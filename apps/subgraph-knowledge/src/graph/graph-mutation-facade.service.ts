/**
 * GraphMutationFacadeService — Write/mutation facade methods for the graph.
 * Delegates to focused sub-services: Concept, ConceptLink, Search,
 * PersonTerm, SourceCluster.
 * Extracted from GraphService to keep files under 300 lines.
 */
import { Injectable } from '@nestjs/common';
import type { ConceptRelationshipType } from '@edusphere/db';
import { GraphConceptService } from './graph-concept.service';
import { GraphConceptLinkService } from './graph-concept-link.service';
import { GraphSearchService } from './graph-search.service';
import { GraphPersonTermService } from './graph-person-term.service';
import { GraphSourceClusterService } from './graph-source-cluster.service';

@Injectable()
export class GraphMutationFacadeService {
  constructor(
    private readonly concept: GraphConceptService,
    private readonly conceptLink: GraphConceptLinkService,
    private readonly search: GraphSearchService,
    private readonly personTerm: GraphPersonTermService,
    private readonly sourceCluster: GraphSourceClusterService
  ) {}

  // ── Concept Mutations ─────────────────────────────────────────────────
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

  // ── Concept Link Mutations ────────────────────────────────────────────
  linkConcepts(
    fromId: string,
    toId: string,
    relationshipType: ConceptRelationshipType,
    strength: number | null,
    description: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.conceptLink.linkConcepts(
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

  // ── Embedding Generation ──────────────────────────────────────────────
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

  // ── Person Mutations ──────────────────────────────────────────────────
  createPerson(
    name: string,
    bio: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.personTerm.createPerson(name, bio, tenantId, userId, role);
  }

  // ── Term Mutations ────────────────────────────────────────────────────
  createTerm(
    name: string,
    definition: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.personTerm.createTerm(name, definition, tenantId, userId, role);
  }

  // ── Source Mutations ──────────────────────────────────────────────────
  createSource(
    title: string,
    type: string,
    url: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.sourceCluster.createSource(
      title,
      type,
      url,
      tenantId,
      userId,
      role
    );
  }

  // ── TopicCluster Mutations ────────────────────────────────────────────
  createTopicCluster(
    name: string,
    description: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return this.sourceCluster.createTopicCluster(
      name,
      description,
      tenantId,
      userId,
      role
    );
  }
}
