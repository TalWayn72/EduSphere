import { Injectable, Logger } from '@nestjs/common';
import { openai } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  async execute(agent: any, input: any): Promise<any> {
    this.logger.debug(`Executing agent: ${agent.template}`);

    try {
      // Choose model based on environment
      const model = process.env.OPENAI_API_KEY 
        ? openai('gpt-4-turbo')
        : openai('gpt-3.5-turbo');

      // Build prompt based on agent template
      const systemPrompt = this.buildSystemPrompt(agent);
      const userPrompt = this.buildUserPrompt(agent, input);

      // Execute with Vercel AI SDK
      const result = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: agent.config?.temperature || 0.7,
        maxTokens: agent.config?.maxTokens || 2000,
      });

      return {
        text: result.text,
        usage: result.usage,
        finishReason: result.finishReason,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`AI execution failed: ${errorMessage}`);
      throw error;
    }
  }

  async executeStream(agent: any, input: any): Promise<any> {
    this.logger.debug(`Streaming agent: ${agent.template}`);

    const model = process.env.OPENAI_API_KEY 
      ? openai('gpt-4-turbo')
      : openai('gpt-3.5-turbo');

    const systemPrompt = this.buildSystemPrompt(agent);
    const userPrompt = this.buildUserPrompt(agent, input);

    return streamText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: agent.config?.temperature || 0.7,
      maxTokens: agent.config?.maxTokens || 2000,
    });
  }

  private buildSystemPrompt(agent: any): string {
    const defaultPrompt = 'You are a helpful AI learning assistant.';

    const templates: Record<string, string> = {
      CHAVRUTA_DEBATE: `You are a Chavruta learning partner. Engage in dialectical debate to explore ideas deeply.
Challenge assumptions, present counter-arguments, and help the learner think critically.`,

      QUIZ_ASSESS: `You are a quiz generator and assessor. Create thoughtful questions to test understanding,
provide immediate feedback, and adapt difficulty based on performance.`,

      EXPLAIN: `You are a clear and patient explainer. Break down complex concepts into simple terms,
use analogies, and check for understanding. Adapt your explanation level to the learner.`,

      SUMMARIZE: `You are a content summarizer. Extract key points, identify main themes, and create
concise summaries that capture the essence of the material.`,

      RESEARCH_SCOUT: `You are a research assistant. Help learners explore topics, suggest resources,
identify knowledge gaps, and guide inquiry-based learning.`,

      CUSTOM: (agent.config?.systemPrompt as string) || defaultPrompt,
    };

    const template = templates[agent.template as keyof typeof templates];
    return template ?? (agent.config?.systemPrompt as string) ?? defaultPrompt;
  }

  private buildUserPrompt(_agent: any, input: any): string {
    const context = input.context ? `Context: ${JSON.stringify(input.context)}\n\n` : '';
    const message = input.message || input.query || '';

    return `${context}${message}`;
  }

  async getConversationMemory(sessionId: string, _limit: number = 10): Promise<any[]> {
    // TODO: Implement conversation memory retrieval
    // This should fetch recent messages from agent_messages table
    // and format them for inclusion in the LLM context
    this.logger.debug(`Retrieving conversation memory for session ${sessionId}`);
    return [];
  }

  async saveConversationMemory(sessionId: string, _role: string, _content: string, _metadata?: any): Promise<void> {
    // TODO: Implement conversation memory storage
    // This should save messages to agent_messages table
    this.logger.debug(`Saving conversation memory for session ${sessionId}`);
  }
}
