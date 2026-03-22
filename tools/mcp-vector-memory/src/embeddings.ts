import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

/**
 * Generate a unique document ID for ChromaDB storage.
 */
export function generateDocId(): string {
  return randomUUID();
}

/**
 * Get current timestamp as ISO string.
 */
export function isoTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Parsed frontmatter result from a markdown file.
 */
export interface ParsedMarkdown {
  frontmatter: Record<string, string | string[]>;
  body: string;
}

/**
 * Parse YAML-like frontmatter from a markdown file.
 * Supports simple `key: value` and `key: [a, b, c]` syntax.
 */
export function parseFrontmatter(content: string): ParsedMarkdown {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = fmRegex.exec(content);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const rawFm = match[1];
  const body = match[2].trim();
  const frontmatter: Record<string, string | string[]> = {};

  for (const line of rawFm.split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    // Handle array syntax: [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1);
      frontmatter[key] = inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    } else {
      // Strip surrounding quotes
      value = value.replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * Read and parse a markdown file with frontmatter.
 */
export async function readMarkdownFile(filePath: string): Promise<ParsedMarkdown> {
  const content = await readFile(filePath, 'utf-8');
  return parseFrontmatter(content);
}

/**
 * Map frontmatter type to a ChromaDB collection name.
 */
export function mapTypeToCollection(type: string): string {
  const mapping: Record<string, string> = {
    user: 'edusphere_feedback',
    feedback: 'edusphere_feedback',
    project: 'edusphere_decisions',
    reference: 'edusphere_decisions',
    bug: 'edusphere_bug_patterns',
    code: 'edusphere_code_patterns',
    agent: 'edusphere_agent_perf',
  };
  return mapping[type.toLowerCase()] ?? 'edusphere_decisions';
}
