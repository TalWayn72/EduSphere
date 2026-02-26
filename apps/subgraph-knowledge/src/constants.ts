/**
 * Knowledge subgraph query limit constants.
 * Source values extracted from graph/graph.resolver.ts and graph/cypher.service.ts.
 */

/**
 * Default page size for concept list queries.
 * Matches the resolver default: @Args('limit') limit: number = 20 (graph.resolver.ts:47)
 */
export const DEFAULT_CONCEPT_LIMIT = 20;

/**
 * Maximum allowed limit clamped inside CypherService.findAllConcepts.
 * Enforced via: Math.max(1, Math.min(200, Math.trunc(limit))) (cypher.service.ts:131)
 */
export const MAX_CONCEPT_LIMIT = 200;

/**
 * Default result count for semantic search queries.
 * Matches: @Args('limit') limit: number = 10 (graph.resolver.ts:134)
 */
export const DEFAULT_SEARCH_LIMIT = 10;
