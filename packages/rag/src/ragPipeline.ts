import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { SemanticRetriever, RetrievalOptions } from './retriever';

export interface RAGOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  retrievalOptions?: RetrievalOptions;
  stream?: boolean;
}

export interface RAGResult {
  answer: string;
  sources: Array<{
    id: string;
    content: string;
    similarity: number;
  }>;
  metadata: {
    model: string;
    tokensUsed?: number;
    retrievalTime: number;
    generationTime: number;
  };
}

export class RAGPipeline {
  private retriever: SemanticRetriever;
  private defaultModel: string;
  private defaultSystemPrompt: string;

  constructor(retriever: SemanticRetriever, model: string = 'gpt-4-turbo') {
    this.retriever = retriever;
    this.defaultModel = model;
    this.defaultSystemPrompt = `You are an AI teaching assistant for EduSphere.
Your role is to help students learn by providing clear, accurate, and educational responses.

When answering questions:
1. Use the provided context from course materials
2. Cite specific sources when referencing material
3. If information is not in the context, acknowledge limitations
4. Encourage critical thinking and deeper exploration
5. Adapt explanations to the student's level

Be concise but thorough. Format answers with clear structure.`;
  }

  async generate(
    query: string,
    tenantId: string,
    options: RAGOptions = {}
  ): Promise<RAGResult> {
    const startRetrieval = Date.now();

    // Retrieve relevant context
    const { results, context } = await this.retriever.retrieveWithContext(
      query,
      tenantId,
      options.retrievalOptions
    );

    const retrievalTime = Date.now() - startRetrieval;
    const startGeneration = Date.now();

    // Generate answer using LLM
    const { text, usage } = await generateText({
      model: openai(options.model || this.defaultModel),
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
      system: options.systemPrompt || this.defaultSystemPrompt,
      prompt: `Context from course materials:
${context}

Student question: ${query}

Please provide a helpful answer based on the context above. If the answer isn't fully covered in the context, acknowledge this and provide what you can.`,
    });

    const generationTime = Date.now() - startGeneration;

    return {
      answer: text,
      sources: results.map((r) => ({
        id: r.id,
        content: r.content,
        similarity: r.similarity,
      })),
      metadata: {
        model: options.model || this.defaultModel,
        tokensUsed: usage?.totalTokens,
        retrievalTime,
        generationTime,
      },
    };
  }

  async *generateStream(
    query: string,
    tenantId: string,
    options: RAGOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    // Retrieve relevant context
    const { context } = await this.retriever.retrieveWithContext(
      query,
      tenantId,
      options.retrievalOptions
    );

    // Stream answer using LLM
    const { textStream } = streamText({
      model: openai(options.model || this.defaultModel),
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
      system: options.systemPrompt || this.defaultSystemPrompt,
      prompt: `Context from course materials:
${context}

Student question: ${query}

Please provide a helpful answer based on the context above.`,
    });

    for await (const chunk of textStream) {
      yield chunk;
    }
  }

  async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    tenantId: string,
    options: RAGOptions = {}
  ): Promise<RAGResult> {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) {
      throw new Error('Messages array is empty');
    }
    if (lastMessage.role !== 'user') {
      throw new Error('Last message must be from user');
    }

    // Retrieve context for the latest query
    const { results, context } = await this.retriever.retrieveWithContext(
      lastMessage.content,
      tenantId,
      options.retrievalOptions
    );

    // Format conversation history
    const conversationHistory = messages
      .slice(0, -1)
      .map(
        (msg) =>
          `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.content}`
      )
      .join('\n\n');

    const startGeneration = Date.now();

    const { text, usage } = await generateText({
      model: openai(options.model || this.defaultModel),
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
      system: options.systemPrompt || this.defaultSystemPrompt,
      prompt: `Conversation history:
${conversationHistory}

Relevant context from course materials:
${context}

Latest student question: ${lastMessage.content}

Continue the conversation with a helpful response.`,
    });

    const generationTime = Date.now() - startGeneration;

    return {
      answer: text,
      sources: results.map((r) => ({
        id: r.id,
        content: r.content,
        similarity: r.similarity,
      })),
      metadata: {
        model: options.model || this.defaultModel,
        tokensUsed: usage?.totalTokens,
        retrievalTime: 0,
        generationTime,
      },
    };
  }
}

export function createRAGPipeline(
  retriever: SemanticRetriever,
  model?: string
): RAGPipeline {
  return new RAGPipeline(retriever, model);
}
