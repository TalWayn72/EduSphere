/**
 * Barrel export for the graph domain services.
 * Import from this file to get all graph services and shared types.
 */
export { GraphService } from './graph.service';
export { GraphResolver } from './graph.resolver';
export { GraphConceptService } from './graph-concept.service';
export { GraphConceptLinkService } from './graph-concept-link.service';
export { GraphSearchService } from './graph-search.service';
export { GraphPersonTermService } from './graph-person-term.service';
export { GraphSourceClusterService } from './graph-source-cluster.service';
export { CypherService } from './cypher.service';
export { CypherConceptService } from './cypher-concept.service';
export { CypherConceptRelationService } from './cypher-concept-relation.service';
export { CypherPersonService } from './cypher-person.service';
export { CypherTermService } from './cypher-term.service';
export { CypherSourceService } from './cypher-source.service';
export { CypherTopicClusterService } from './cypher-topic-cluster.service';
export {
  CypherLearningPathService,
  type ConceptNode,
  type LearningPathResult,
} from './cypher-learning-path.service';
export { KMeansDataService } from './kmeans-data.service';
export { TopicClusterKMeansService } from './topic-cluster-kmeans.service';
export { SocialRecommendationsService } from './social-recommendations.service';
export { SocialRecommendationsDataService } from './social-recommendations-data.service';
export { GraphModule } from './graph.module';
export { GapAnalysisService } from './gap-analysis.service';
export type {
  KnowledgeGap,
  GapReport,
} from './gap-analysis.service';
