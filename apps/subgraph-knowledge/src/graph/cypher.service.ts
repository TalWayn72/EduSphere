/**
 * CypherService — thin facade over 6 domain-specific Cypher service classes.
 *
 * This file is intentionally small: it only delegates to the domain services
 * (CypherConceptService, CypherPersonService, CypherTermService,
 * CypherSourceService, CypherTopicClusterService, CypherLearningPathService).
 *
 * ALL consumers (GraphService, NatsConsumer, etc.) continue to inject and call
 * CypherService without any changes — the facade preserves every original method
 * signature exactly.
 *
 * SECURITY: No user-supplied values are interpolated here; security is enforced
 * in each domain service via AGE parameterized queries.
 */
import { Injectable } from '@nestjs/common';
import type { ConceptProperties, RelationshipProperties } from '@edusphere/db';
import { CypherConceptService } from './cypher-concept.service';
import { CypherPersonService } from './cypher-person.service';
import { CypherTermService } from './cypher-term.service';
import { CypherSourceService } from './cypher-source.service';
import { CypherTopicClusterService } from './cypher-topic-cluster.service';
import {
  CypherLearningPathService,
  type ConceptNode,
  type LearningPathResult,
} from './cypher-learning-path.service';

// Re-export the shared types so existing imports from './cypher.service' continue to work.
export type { ConceptNode, LearningPathResult };

@Injectable()
export class CypherService {
  constructor(
    private readonly concept: CypherConceptService,
    private readonly person: CypherPersonService,
    private readonly term: CypherTermService,
    private readonly source: CypherSourceService,
    private readonly topicCluster: CypherTopicClusterService,
    private readonly learningPath: CypherLearningPathService
  ) {}

  // ── Concept ────────────────────────────────────────────────────────────────

  findConceptById(id: string, tenantId: string) {
    return this.concept.findConceptById(id, tenantId);
  }

  findConceptByName(name: string, tenantId: string) {
    return this.concept.findConceptByName(name, tenantId);
  }

  findConceptByNameCaseInsensitive(name: string, tenantId: string) {
    return this.concept.findConceptByNameCaseInsensitive(name, tenantId);
  }

  linkConceptsByName(
    fromName: string,
    toName: string,
    tenantId: string,
    strength: number = 0.7
  ) {
    return this.concept.linkConceptsByName(
      fromName,
      toName,
      tenantId,
      strength
    );
  }

  findAllConcepts(tenantId: string, limit: number) {
    return this.concept.findAllConcepts(tenantId, limit);
  }

  createConcept(props: ConceptProperties) {
    return this.concept.createConcept(props);
  }

  updateConcept(
    id: string,
    tenantId: string,
    updates: Partial<ConceptProperties>
  ) {
    return this.concept.updateConcept(id, tenantId, updates);
  }

  deleteConcept(id: string, tenantId: string) {
    return this.concept.deleteConcept(id, tenantId);
  }

  findRelatedConcepts(
    conceptId: string,
    tenantId: string,
    depth: number = 2,
    limit: number = 10
  ) {
    return this.concept.findRelatedConcepts(conceptId, tenantId, depth, limit);
  }

  linkConcepts(
    fromId: string,
    toId: string,
    relationshipType: string,
    properties: RelationshipProperties = {}
  ) {
    return this.concept.linkConcepts(
      fromId,
      toId,
      relationshipType,
      properties
    );
  }

  /**
   * linkConceptsAndFetch — creates the relationship AND returns both endpoint
   * nodes in a single Cypher round-trip.  Exposed via this facade so that
   * GraphService can call it without knowing the concrete concept service.
   */
  linkConceptsAndFetch(
    fromId: string,
    toId: string,
    relationshipType: string,
    properties: RelationshipProperties,
    tenantId: string
  ): Promise<{ from: unknown; to: unknown }> {
    return this.concept.linkConceptsAndFetch(
      fromId,
      toId,
      relationshipType,
      properties,
      tenantId
    );
  }

  // ── Person ─────────────────────────────────────────────────────────────────

  findPersonById(id: string, tenantId: string) {
    return this.person.findPersonById(id, tenantId);
  }

  findPersonByName(name: string, tenantId: string) {
    return this.person.findPersonByName(name, tenantId);
  }

  createPerson(name: string, bio: string | null, tenantId: string) {
    return this.person.createPerson(name, bio, tenantId);
  }

  // ── Term ───────────────────────────────────────────────────────────────────

  findTermById(id: string, tenantId: string) {
    return this.term.findTermById(id, tenantId);
  }

  findTermByName(name: string, tenantId: string) {
    return this.term.findTermByName(name, tenantId);
  }

  createTerm(name: string, definition: string, tenantId: string) {
    return this.term.createTerm(name, definition, tenantId);
  }

  // ── Source ─────────────────────────────────────────────────────────────────

  findSourceById(id: string, tenantId: string) {
    return this.source.findSourceById(id, tenantId);
  }

  createSource(
    title: string,
    type: string,
    url: string | null,
    tenantId: string
  ) {
    return this.source.createSource(title, type, url, tenantId);
  }

  // ── TopicCluster ───────────────────────────────────────────────────────────

  findTopicClusterById(id: string, tenantId: string) {
    return this.topicCluster.findTopicClusterById(id, tenantId);
  }

  findTopicClustersByCourse(courseId: string, tenantId: string) {
    return this.topicCluster.findTopicClustersByCourse(courseId, tenantId);
  }

  createTopicCluster(
    name: string,
    description: string | null,
    tenantId: string
  ) {
    return this.topicCluster.createTopicCluster(name, description, tenantId);
  }

  // ── Learning Paths ─────────────────────────────────────────────────────────

  findShortestLearningPath(
    fromName: string,
    toName: string,
    tenantId: string
  ): Promise<LearningPathResult | null> {
    return this.learningPath.findShortestLearningPath(
      fromName,
      toName,
      tenantId
    );
  }

  collectRelatedConcepts(
    conceptName: string,
    depth: number,
    tenantId: string
  ): Promise<ConceptNode[]> {
    return this.learningPath.collectRelatedConcepts(
      conceptName,
      depth,
      tenantId
    );
  }

  findPrerequisiteChain(
    conceptName: string,
    tenantId: string
  ): Promise<ConceptNode[]> {
    return this.learningPath.findPrerequisiteChain(conceptName, tenantId);
  }
}
