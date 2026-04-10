/**
 * LessonPipelineResolver — Phase 58.
 * Handles the generateLesson mutation.
 * Wires real pgvector semantic search via the knowledge subgraph.
 */
import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { createOllama } from 'ollama-ai-provider';
import type { LanguageModel } from 'ai';
import { randomUUID } from 'crypto';
import {
  runLessonPipeline,
  type LessonPipelineInput,
  type CitationSearchFn,
  type GraphEnrichFn,
} from '../workflows/lesson-pipeline.workflow.js';
import type { GraphQLContext } from '@edusphere/auth';

function getModel(): LanguageModel {
  const ollama = createOllama({
    baseURL: process.env['OLLAMA_URL'] ?? 'http://localhost:11434',
  });
  const modelId = process.env['OLLAMA_MODEL'] ?? 'llama3.2';
  return ollama(modelId) as unknown as LanguageModel;
}

interface SemanticSearchResponse {
  data?: {
    searchSemantic?: Array<{
      id: string;
      text: string;
      similarity: number;
      entityType: string;
    }>;
  };
}

interface RelatedConceptsResponse {
  data?: {
    relatedConceptsByName?: Array<{
      id: string;
      name: string;
      type?: string;
    }>;
  };
}

@Resolver()
export class LessonPipelineResolver {
  private readonly logger = new Logger(LessonPipelineResolver.name);

  private createSearchFn(authHeader?: string): CitationSearchFn {
    const knowledgeUrl =
      process.env['SUBGRAPH_KNOWLEDGE_URL'] ?? 'http://localhost:4006/graphql';

    return async (query: string, limit: number) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authHeader) headers['Authorization'] = authHeader;

      const resp = await fetch(knowledgeUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `query($q: String!, $limit: Int) {
            searchSemantic(query: $q, limit: $limit) {
              id text similarity entityType
            }
          }`,
          variables: { q: query, limit },
        }),
      });

      if (!resp.ok) {
        throw new Error(`Knowledge subgraph HTTP ${resp.status}`);
      }

      const json = (await resp.json()) as SemanticSearchResponse;
      const results = json.data?.searchSemantic ?? [];
      return results.map((r) => ({
        id: r.id,
        text: r.text,
        similarity: r.similarity,
        source: r.entityType,
      }));
    };
  }

  private createGraphEnrichFn(authHeader?: string): GraphEnrichFn {
    const knowledgeUrl =
      process.env['SUBGRAPH_KNOWLEDGE_URL'] ?? 'http://localhost:4006/graphql';

    return async (topic: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authHeader) headers['Authorization'] = authHeader;

      const resp = await fetch(knowledgeUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `query($conceptName: String!) {
            relatedConceptsByName(conceptName: $conceptName, depth: 2) {
              id name type
            }
          }`,
          variables: { conceptName: topic },
        }),
      });

      if (!resp.ok) {
        throw new Error(`Knowledge subgraph HTTP ${resp.status}`);
      }

      const json = (await resp.json()) as RelatedConceptsResponse;
      return (json.data?.relatedConceptsByName ?? []).map((c) => ({
        name: c.name,
        type: c.type,
      }));
    };
  }

  @Mutation('generateLesson')
  async generateLesson(
    @Args('input') input: LessonPipelineInput,
    @Context() ctx: GraphQLContext
  ) {
    if (!ctx.authContext?.userId) {
      throw new GraphQLError('Unauthorized', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }

    const executionId = randomUUID();
    const model = getModel();

    // Extract auth header for forwarding to knowledge subgraph
    const authHeader = (ctx as unknown as Record<string, unknown>)[
      'authorization'
    ] as string | undefined;
    const searchFn = this.createSearchFn(authHeader);
    const graphEnrichFn = this.createGraphEnrichFn(authHeader);

    this.logger.log(
      { executionId, userId: ctx.authContext.userId },
      '[LessonPipelineResolver] generateLesson started with real citations'
    );

    return runLessonPipeline(input, model, executionId, searchFn, graphEnrichFn);
  }
}
