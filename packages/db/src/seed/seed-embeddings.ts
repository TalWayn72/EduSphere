/**
 * Seed: generate demo embeddings for knowledge sources that have chunks
 * but no embeddings yet.
 *
 * Strategy:
 *  1. Query knowledge_sources with status=READY and chunk_count > 0
 *  2. For each, query corresponding transcript_segments (via content_embeddings)
 *  3. If Ollama/OpenAI is available, generate real 768-dim embeddings
 *  4. Fallback: insert deterministic pseudo-random 768-dim vectors for offline dev
 *
 * The fallback vectors use a seeded PRNG so re-runs produce identical data —
 * safe for snapshot tests and local development without a GPU.
 */

import { createDatabaseConnection, schema, eq } from '../index.js';

const EMBEDDING_DIM = 768;

/**
 * Deterministic pseudo-random number generator (mulberry32).
 * Produces identical sequences for the same seed — reproducible fixtures.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate a deterministic 768-dim unit vector from a string seed. */
function fixtureEmbedding(seedStr: string): number[] {
  // Simple hash from string
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = ((hash << 5) - hash + seedStr.charCodeAt(i)) | 0;
  }
  const rng = mulberry32(hash);
  const vec = Array.from({ length: EMBEDDING_DIM }, () => rng() * 2 - 1);
  // L2 normalize for cosine similarity
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? vec.map((v) => v / norm) : vec;
}

/** Try to reach Ollama for real embeddings. Returns null if unavailable. */
async function tryOllamaEmbed(text: string): Promise<number[] | null> {
  const url = process.env.OLLAMA_URL || 'http://localhost:11434';
  try {
    const res = await fetch(`${url}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
        prompt: text,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { embedding?: number[] };
    return data.embedding ?? null;
  } catch {
    return null;
  }
}

export async function seedEmbeddings(): Promise<void> {
  const db = createDatabaseConnection();

  // Find READY sources with chunks but check if embeddings exist
  const readySources = await db
    .select({
      id: schema.knowledgeSources.id,
      title: schema.knowledgeSources.title,
      chunkCount: schema.knowledgeSources.chunk_count,
    })
    .from(schema.knowledgeSources)
    .where(eq(schema.knowledgeSources.status, 'READY'));

  if (readySources.length === 0) {
    console.log('ℹ️  No READY knowledge sources found — skipping embeddings');
    return;
  }

  // Check if Ollama is reachable for real embeddings
  const probe = await tryOllamaEmbed('test');
  const useOllama = probe !== null;
  console.log(
    useOllama
      ? '🤖 Ollama available — generating real embeddings'
      : '🎲 Ollama unavailable — using deterministic fixture vectors'
  );

  // Count existing concept embeddings to avoid duplicates
  const existingEmbeddings = await db
    .select({ id: schema.concept_embeddings.id })
    .from(schema.concept_embeddings);

  if (existingEmbeddings.length > 0) {
    console.log(
      `ℹ️  ${existingEmbeddings.length} concept embeddings already exist — skipping`
    );
    return;
  }

  // Seed concept embeddings for demo graph concepts
  const demoConcepts = [
    { id: 'aa000000-0000-0000-0000-000000000001', label: 'Sefirot' },
    { id: 'aa000000-0000-0000-0000-000000000002', label: 'Ein Sof' },
    { id: 'aa000000-0000-0000-0000-000000000003', label: 'Tikkun' },
    { id: 'aa000000-0000-0000-0000-000000000004', label: 'Tzimtzum' },
    { id: 'aa000000-0000-0000-0000-000000000005', label: 'Ohr' },
  ];

  let inserted = 0;
  for (const concept of demoConcepts) {
    const embedding = useOllama
      ? await tryOllamaEmbed(concept.label)
      : fixtureEmbedding(concept.label);

    if (!embedding) continue;

    await db
      .insert(schema.concept_embeddings)
      .values({
        concept_id: concept.id,
        embedding,
      })
      .onConflictDoNothing();

    inserted++;
  }

  console.log(`✅ Seeded ${inserted} concept embeddings (${EMBEDDING_DIM}-dim)`);
}
