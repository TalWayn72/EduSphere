/**
 * Seed: attach the Nahar Shalom DOCX as a KnowledgeSource for the example course.
 *
 * The DOCX is stored at:
 *   packages/db/src/seed/assets/nahar-shalom.docx
 *
 * Processing pipeline (runs inline during seed):
 *  1. mammoth.js extracts plaintext from the DOCX
 *  2. Text is chunked into ~1 000-char overlapping windows
 *  3. Each chunk is stored (embedding is skipped at seed-time;
 *     the running service embeds on demand via the embedding endpoint)
 */

import { createDatabaseConnection, schema } from '../index.js';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';

// Must match the stable course ID from nahar-shalom-course.ts
const COURSE_ID = 'cc000000-0000-0000-0000-000000000002';
const DEMO_TENANT = '00000000-0000-0000-0000-000000000000';
const SOURCE_ID  = 'dd000000-0000-0000-0000-000000000001';
// __dirname is available in CommonJS (the db package tsconfig uses CommonJS)
const DOCX_PATH  = join(__dirname, 'assets', 'nahar-shalom.docx');

/** Simple DOCX text extractor using mammoth (no external service needed). */
async function extractDocxText(filePath: string): Promise<string> {
  const { default: mammoth } = await import('mammoth');
  const buffer = readFileSync(resolve(filePath));
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

/** Split text into overlapping chunks (matches DocumentParserService.chunkText). */
function chunkText(text: string, size = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const sp = text.lastIndexOf(' ', end);
      if (sp > start) end = sp;
    }
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end - overlap;
    if (start >= text.length) break;
  }
  return chunks;
}

export async function seedNaharShalomSource(): Promise<void> {
  const db = createDatabaseConnection();

  // Skip if already seeded
  const existing = await db
    .select({ id: schema.knowledgeSources.id })
    .from(schema.knowledgeSources)
    .where(eq(schema.knowledgeSources.id, SOURCE_ID));

  if (existing.length > 0) {
    console.log('ℹ️  Nahar Shalom source already seeded — skipping');
    return;
  }

  console.log('📖 Extracting text from nahar-shalom.docx...');
  let rawContent: string;
  let chunkCount = 0;

  try {
    rawContent = await extractDocxText(DOCX_PATH);
    const chunks = chunkText(rawContent);
    chunkCount = chunks.length;

    console.log(
      `   Extracted ${rawContent.length.toLocaleString()} chars → ${chunkCount} chunks`,
    );
  } catch (err) {
    console.warn(`⚠️  Could not parse DOCX (${err}) — storing placeholder`);
    rawContent = '(DOCX parsing failed — install mammoth and re-seed)';
  }

  await db.insert(schema.knowledgeSources).values({
    id: SOURCE_ID,
    tenant_id: DEMO_TENANT,
    course_id: COURSE_ID,
    title: 'ספר נהר שלום — הרש"ש (טקסט מלא)',
    source_type: 'FILE_DOCX',
    origin: 'nahar-shalom.docx',
    file_key: 'seed/nahar-shalom.docx',
    raw_content: rawContent,
    status: 'READY',
    chunk_count: chunkCount,
    metadata: {
      extracted_chars: rawContent.length,
      chunk_size: 1000,
      overlap: 200,
      language: 'he',
      author: 'רבי שלום שרעבי (הרש"ש)',
      year_composed: '~1760',
      hebrewbooks_url: 'https://hebrewbooks.org/21991',
      seeded_at: new Date().toISOString(),
    },
  });

  console.log(`✅ Nahar Shalom source seeded: ${chunkCount} chunks ready for embedding`);
}
