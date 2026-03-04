import { Module } from '@nestjs/common';
import { GraphResolver } from './graph.resolver';
import { GraphService } from './graph.service';
import { GraphConceptService } from './graph-concept.service';
import { GraphConceptLinkService } from './graph-concept-link.service';
import { GraphSearchService } from './graph-search.service';
import { GraphPersonTermService } from './graph-person-term.service';
import { GraphSourceClusterService } from './graph-source-cluster.service';
import { CypherService } from './cypher.service';
import { CypherConceptService } from './cypher-concept.service';
import { CypherConceptRelationService } from './cypher-concept-relation.service';
import { CypherPersonService } from './cypher-person.service';
import { CypherTermService } from './cypher-term.service';
import { CypherSourceService } from './cypher-source.service';
import { CypherTopicClusterService } from './cypher-topic-cluster.service';
import { CypherLearningPathService } from './cypher-learning-path.service';
import { TopicClusterKMeansService } from './topic-cluster-kmeans.service';
import { KMeansDataService } from './kmeans-data.service';
import { EmbeddingModule } from '../embedding/embedding.module';
import { AutoPathResolver } from './auto-path.resolver';
import { AutoPathService } from './auto-path.service';
import { SkillGapResolver } from './skill-gap.resolver';
import { SkillGapService } from './skill-gap.service';
import { SkillGapRecommendations } from './skill-gap.recommendations';
import { SocialRecommendationsService } from './social-recommendations.service';
import { SocialRecommendationsDataService } from './social-recommendations-data.service';
import { SocialRecommendationsResolver } from './social-recommendations.resolver';

@Module({
  imports: [EmbeddingModule],
  providers: [
    // ── Layer 1: Domain-level Cypher services (leaf nodes — no inter-provider deps)
    CypherConceptService,
    CypherConceptRelationService,
    CypherPersonService,
    CypherTermService,
    CypherSourceService,
    CypherTopicClusterService,
    CypherLearningPathService,
    // ── K-means topic clustering data + orchestrator
    KMeansDataService,
    TopicClusterKMeansService, // depends on CypherTopicClusterService + KMeansDataService
    // ── Layer 2: CypherService facade (depends on all domain Cypher services above)
    CypherService,
    // ── Layer 3: Application sub-services (depend on domain Cypher services)
    GraphConceptService,       // → CypherConceptService
    GraphConceptLinkService,   // → CypherConceptRelationService
    GraphSearchService,        // → CypherConceptService + EmbeddingService
    GraphPersonTermService,    // → CypherPersonService, CypherTermService
    GraphSourceClusterService, // → CypherSourceService, CypherTopicClusterService, CypherLearningPathService
    // ── Layer 4: Facade (depends on all Layer 3 services)
    GraphService,
    // ── Resolvers & supporting services
    GraphResolver,
    AutoPathResolver,
    AutoPathService,
    SkillGapResolver,
    SkillGapService,
    SkillGapRecommendations,
    SocialRecommendationsDataService,
    SocialRecommendationsService,
    SocialRecommendationsResolver,
  ],
  exports: [GraphService, CypherService],
})
export class GraphModule {}
