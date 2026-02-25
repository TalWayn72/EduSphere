import { Module } from '@nestjs/common';
import { GraphResolver } from './graph.resolver';
import { GraphService } from './graph.service';
import { GraphConceptService } from './graph-concept.service';
import { GraphSearchService } from './graph-search.service';
import { GraphPersonTermService } from './graph-person-term.service';
import { CypherService } from './cypher.service';
import { CypherConceptService } from './cypher-concept.service';
import { CypherPersonService } from './cypher-person.service';
import { CypherTermService } from './cypher-term.service';
import { CypherSourceService } from './cypher-source.service';
import { CypherTopicClusterService } from './cypher-topic-cluster.service';
import { CypherLearningPathService } from './cypher-learning-path.service';
import { EmbeddingModule } from '../embedding/embedding.module';
import { AutoPathResolver } from './auto-path.resolver';
import { AutoPathService } from './auto-path.service';
import { SkillGapResolver } from './skill-gap.resolver';
import { SkillGapService } from './skill-gap.service';
import { SkillGapRecommendations } from './skill-gap.recommendations';
import { SocialRecommendationsService } from './social-recommendations.service';
import { SocialRecommendationsResolver } from './social-recommendations.resolver';

@Module({
  imports: [EmbeddingModule],
  providers: [
    // ── Layer 1: Domain-level Cypher services (leaf nodes — no inter-provider deps)
    CypherConceptService,
    CypherPersonService,
    CypherTermService,
    CypherSourceService,
    CypherTopicClusterService,
    CypherLearningPathService,
    // ── Layer 2: CypherService facade (depends on all 6 domain Cypher services above)
    CypherService,
    // ── Layer 3: Application sub-services (depend on domain Cypher services)
    GraphConceptService,   // → CypherConceptService
    GraphSearchService,    // → CypherConceptService + EmbeddingService
    GraphPersonTermService, // → CypherPersonService, CypherTermService, CypherSourceService,
                            //   CypherTopicClusterService, CypherLearningPathService
    // ── Layer 4: Facade (depends on GraphConceptService, GraphSearchService, GraphPersonTermService)
    GraphService,
    // ── Resolvers & supporting services
    GraphResolver,
    AutoPathResolver,
    AutoPathService,
    SkillGapResolver,
    SkillGapService,
    SkillGapRecommendations,
    SocialRecommendationsService,
    SocialRecommendationsResolver,
  ],
  exports: [GraphService, CypherService],
})
export class GraphModule {}
