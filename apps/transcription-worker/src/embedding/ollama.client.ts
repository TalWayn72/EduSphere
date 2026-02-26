import { Logger } from '@nestjs/common';
import { ollamaConfig } from '@edusphere/config';

/**
 * Thin HTTP client for Ollama / OpenAI embeddings.
 *
 * Priority:
 *   1. Ollama (OLLAMA_URL set) — nomic-embed-text (768-dim)
 *   2. OpenAI (OPENAI_API_KEY set) — text-embedding-3-small (1536-dim, truncated to 768)
 *   3. Neither → throws so callers can log + skip
 */

const logger = new Logger('OllamaClient');

interface OllamaEmbeddingResponse {
  embedding: number[];
}

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

export async function embed(text: string): Promise<number[]> {
  const ollamaUrl = process.env.OLLAMA_URL;
  const openaiKey = process.env.OPENAI_API_KEY;
  const model = ollamaConfig.embeddingModel;

  if (ollamaUrl) {
    return embedWithOllama(ollamaConfig.url, model, text);
  }

  if (openaiKey) {
    return embedWithOpenAI(openaiKey, text);
  }

  throw new Error(
    'No embedding provider configured: set OLLAMA_URL or OPENAI_API_KEY'
  );
}

async function embedWithOllama(
  baseUrl: string,
  model: string,
  text: string
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

  const json = (await resp.json()) as OllamaEmbeddingResponse;

  if (!Array.isArray(json.embedding) || json.embedding.length === 0) {
    throw new Error('Ollama returned empty embedding vector');
  }

  logger.debug(`Ollama embed: model=${model} dim=${json.embedding.length}`);
  return json.embedding;
}

async function embedWithOpenAI(
  apiKey: string,
  text: string
): Promise<number[]> {
  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: ollamaConfig.embeddingDimension,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`OpenAI embeddings error ${resp.status}: ${body}`);
  }

  const json = (await resp.json()) as OpenAIEmbeddingResponse;
  const vector = json.data?.[0]?.embedding;

  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error('OpenAI returned empty embedding vector');
  }

  logger.debug(`OpenAI embed: dim=${vector.length}`);
  return vector;
}
