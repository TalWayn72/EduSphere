/**
 * CypherService — thin facade over 7 domain-specific Cypher service classes.
 *
 * Delegates to:
 *   CypherConceptService        — Concept CRUD (find/create/update/delete)
 *   CypherConceptRelationService — Concept edge queries (link, findRelated)
 *   CypherPersonService         — Person vertex queries
 *   CypherTermService           — Term vertex queries
 *   CypherSourceService         — Source vertex queries
 *   CypherTopicClusterService   — TopicCluster vertex queries
 *   CypherLearningPathService   — Shortest-path / prerequisite chains
 *
 * ALL consumers continue to inject and call CypherService without changes —
 * the facade preserves every original method signature exactly.
 *
 * SECURITY: No user-supplied values are interpolated here; each domain service
 * enforces security via AGE parameterized queries.
 */
import { Injectable } from '@nestjs/common';
import type { ConceptProperties, RelationshipProperties } from '@edusphere/db';
import { CypherConceptService } from './cypher-concept.service';
import { CypherConceptRelationService } from './cypher-concept-relation.service';
import { CypherPersonService } from './cypher-person.service';
import { CypherTermService } from './cypher-term.service';
import { CypherSourceService } from './cypher-source.service';
import { CypherTopicClusterService } from './cypher-topic-cluster.service';
import {
  CypherLearningPathService,
  type ConceptNode,
  type LearningPathResult,
} from './cypher-learning-path.service';

// Re-export shared types so existing imports from './cypher.service' continue to work.
export type { ConceptNode, LearningPathResult };

@Injectable()
export class CypherService {
  constructor(
    private readonly concept: CypherConceptService,
    private readonly conceptRelation: CypherConceptRelationService,
    private readonly person: CypherPersonService,
    private readonly term: CypherTermService,
    private readonly source: CypherSourceService,
    private readonly topicCluster: CypherTopicClusterService,
    private readonly learningPath: CypherLearningPathService
  ) {}

  // ── Concept CRUD ────────────────────────────────────────────────────────────

  findConceptById(id: string, tenantId: string) {
    return this.concept.findConceptById(id, tenantId);
  }

  findConceptByName(name: string, tenantId: string) {
    return this.concept.findConceptByName(name, tenantId);
  }

  findConceptByNameCaseInsensitive(name: string, tenantId: string) {
    return this.concept.findConceptByNameCaseInsensitive(name, tenantId);
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

  // ── Concept Relations ───────────────────────────────────────────────────────

  linkConceptsByName(
    fromName: string,
    toName: string,
    tenantId: string,
    strength: number = 0.7
  ) {
    return this.conceptRelation.linkConceptsByName(
      fromName,
      toName,
      tenantId,
      strength
    );
  }

  findRelatedConcepts(
    conceptId: string,
    tenantId: string,
    depth: number = 2,
    limit: number = 10
  ) {
    return this.conceptRelation.findRelatedConcepts(
      conceptId,
      tenantId,
      depth,
      limit
    );
  }

  linkConcepts(
    fromId: string,
    toId: string,
    relationshipType: string,
    properties: RelationshipProperties = {}
  ) {
    return this.conceptRelation.linkConcepts(
      fromId,
      toId,
      relationshipType,
      properties
    );
  }

  linkConceptsAndFetch(
    fromId: string,
    toId: string,
    relationshipType: string,
    properties: RelationshipProperties,
    tenantId: string
  ): Promise<{ from: unknown; to: unknown }> {
    return this.conceptRelation.linkConceptsAndFetch(
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
