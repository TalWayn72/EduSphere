/**
 * Thin embedding client for plagiarism detection (F-005).
 * Mirrors the pattern from apps/transcription-worker/src/embedding/ollama.client.ts
 * but as a class so it can be injected via NestJS DI.
 */
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmbeddingClient {
  private readonly logger = new Logger(EmbeddingClient.name);

  async embed(text: string): Promise<number[]> {
    const ollamaUrl = process.env.OLLAMA_URL;
    const openaiKey = process.env.OPENAI_API_KEY;
    const model = process.env.EMBEDDING_MODEL ?? 'nomic-embed-text';

    if (ollamaUrl) {
      return this.embedWithOllama(ollamaUrl, model, text);
    }
    if (openaiKey) {
      return this.embedWithOpenAI(openaiKey, text);
    }
    throw new Error(
      'No embedding provider configured: set OLLAMA_URL or OPENAI_API_KEY',
    );
  }

  private async embedWithOllama(
    baseUrl: string,
    model: string,
    text: string,
  ): Promise<number[]> {
    const url = `${baseUrl.replace(/\/$/, '')}/api/embeddings`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`Ollama embeddings error ${resp.status}: ${body}`);
    }
    const json = (await resp.json()) as { embedding: number[] };
    if (!Array.isArray(json.embedding) || json.embedding.length === 0) {
      throw new Error('Ollama returned empty embedding vector');
    }
    this.logger.debug(`Ollama embed: model=${model} dim=${json.embedding.length}`);
    return json.embedding;
  }

  private async embedWithOpenAI(apiKey: string, text: string): Promise<number[]> {
    const resp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 768,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`OpenAI embeddings error ${resp.status}: ${body}`);
    }
    const json = (await resp.json()) as { data: Array<{ embedding: number[] }> };
    const vector = json.data?.[0]?.embedding;
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('OpenAI returned empty embedding vector');
    }
    this.logger.debug(`OpenAI embed: dim=${vector.length}`);
    return vector;
  }
}
