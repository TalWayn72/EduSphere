import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmbeddingProviderService {
  private readonly logger = new Logger(EmbeddingProviderService.name);

  async generateEmbedding(text: string): Promise<number[]> {
    const ollamaUrl = process.env.OLLAMA_URL;
    const openaiKey = process.env.OPENAI_API_KEY;
    const model = process.env.EMBEDDING_MODEL ?? 'nomic-embed-text';

    if (ollamaUrl) {
      const resp = await fetch(
        `${ollamaUrl.replace(/\/$/, '')}/api/embeddings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt: text }),
        }
      );
      if (!resp.ok) {
        throw new Error(`Ollama error ${resp.status}`);
      }
      const json = (await resp.json()) as { embedding: number[] };
      return json.embedding;
    }

    if (openaiKey) {
      const resp = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
          dimensions: 768,
        }),
      });
      if (!resp.ok) {
        throw new Error(`OpenAI error ${resp.status}`);
      }
      const json = (await resp.json()) as {
        data: Array<{ embedding: number[] }>;
      };
      return json.data[0]!.embedding;
    }

    throw new Error('No embedding provider: set OLLAMA_URL or OPENAI_API_KEY');
  }

  hasProvider(): boolean {
    return !!(process.env.OLLAMA_URL ?? process.env.OPENAI_API_KEY);
  }
}
