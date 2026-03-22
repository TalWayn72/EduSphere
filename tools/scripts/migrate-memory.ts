import { ChromaClient } from 'chromadb';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const MEMORY_DIR = 'C:\\Users\\P0039217\\.claude\\projects\\c--Users-P0039217--claude-projects-EduSphere\\memory';
const CHROMADB_URL = process.env.CHROMADB_URL || 'http://localhost:8000';

const TYPE_TO_COLLECTION: Record<string, string> = {
  user: 'edusphere_feedback',
  feedback: 'edusphere_feedback',
  project: 'edusphere_decisions',
  reference: 'edusphere_decisions',
};

interface MemoryFile {
  name: string;
  description: string;
  type: string;
  content: string;
  filename: string;
}

function parseFrontmatter(raw: string): MemoryFile {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { name: '', description: '', type: 'project', content: raw, filename: '' };

  const frontmatter = match[1];
  const content = match[2].trim();

  const name = frontmatter.match(/name:\s*(.+)/)?.[1]?.trim() || '';
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim() || '';
  const type = frontmatter.match(/type:\s*(.+)/)?.[1]?.trim() || 'project';

  return { name, description, type, content, filename: '' };
}

async function migrate() {
  const client = new ChromaClient({ path: CHROMADB_URL });

  const files = readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');

  console.log(`Found ${files.length} memory files to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const file of files) {
    const raw = readFileSync(join(MEMORY_DIR, file), 'utf-8');
    const parsed = parseFrontmatter(raw);
    parsed.filename = file;

    const collectionName = TYPE_TO_COLLECTION[parsed.type] || 'edusphere_decisions';

    try {
      const collection = await client.getOrCreateCollection({ name: collectionName });

      const docText = `${parsed.name}\n${parsed.description}\n\n${parsed.content}`;

      await collection.add({
        ids: [`migrated-${file.replace('.md', '')}`],
        documents: [docText],
        metadatas: [{
          source: 'markdown-migration',
          original_file: file,
          type: parsed.type,
          name: parsed.name,
          description: parsed.description,
          migrated_at: new Date().toISOString(),
        }],
      });

      migrated++;
      console.log(`  + ${file} -> ${collectionName}`);
    } catch (err) {
      skipped++;
      console.log(`  x ${file} -- ${(err as Error).message}`);
    }
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${skipped} skipped`);
}

migrate().catch(console.error);
