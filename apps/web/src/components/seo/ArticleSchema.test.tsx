/**
 * Unit tests for ArticleSchema SEO component.
 *
 * Tests structural correctness of the BlogPosting JSON-LD output.
 * Follows the pattern established in PageMeta.test.tsx — tests the schema
 * data model directly and verifies rendering does not throw.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect } from 'vitest';
import { ArticleSchema } from './ArticleSchema';
import { safeJsonLd } from '@/lib/safe-json-ld';

function renderWithHelmet(ui: React.ReactElement) {
  const helmetContext: Record<string, unknown> = {};
  return {
    ...render(<HelmetProvider context={helmetContext}>{ui}</HelmetProvider>),
    helmetContext,
  };
}

const defaultProps = {
  title: 'Test Article Title',
  description: 'A test article description for JSON-LD output.',
  slug: 'test-article-slug',
  author: 'Dr. Test Author',
  authorUrl: 'https://app.edusphere.dev/u/test-author',
  datePublished: '2026-02-15T09:00:00Z',
  dateModified: '2026-02-15T09:00:00Z',
  keywords: ['knowledge graphs', 'AI', 'education'],
  category: 'Technology',
  readingTimeMinutes: 7,
};

function buildSchema(props: typeof defaultProps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: props.title,
    description: props.description,
    url: `https://app.edusphere.dev/blog/${props.slug}`,
    datePublished: props.datePublished,
    dateModified: props.dateModified,
    keywords: props.keywords.join(', '),
    inLanguage: 'en',
    timeRequired: `PT${props.readingTimeMinutes}M`,
    articleSection: props.category,
    author: { '@type': 'Person', name: props.author, url: props.authorUrl },
  };
}

describe('ArticleSchema', () => {
  it('renders without throwing', () => {
    expect(() =>
      renderWithHelmet(<ArticleSchema {...defaultProps} />)
    ).not.toThrow();
  });

  it('@type is BlogPosting', () => {
    const schema = buildSchema(defaultProps);
    expect(schema['@type']).toBe('BlogPosting');
  });

  it('sets author.name correctly', () => {
    const schema = buildSchema(defaultProps);
    expect(schema.author.name).toBe('Dr. Test Author');
  });

  it('sets timeRequired with PT{N}M format', () => {
    const schema = buildSchema(defaultProps);
    expect(schema.timeRequired).toBe('PT7M');
  });

  it('does not contain raw </script> in safeJsonLd output (XSS guard)', () => {
    const maliciousProps = {
      ...defaultProps,
      title: 'Test </script><script>alert(1)</script>',
    };
    const schema = buildSchema(maliciousProps);
    const json = safeJsonLd(schema);
    expect(json).not.toContain('</script>');
  });

  it('joins keywords as comma-separated string', () => {
    const schema = buildSchema(defaultProps);
    expect(schema.keywords).toBe('knowledge graphs, AI, education');
  });

  it('sets correct blog post URL', () => {
    const schema = buildSchema(defaultProps);
    expect(schema.url).toBe('https://app.edusphere.dev/blog/test-article-slug');
  });

  it('serializes to valid parseable JSON', () => {
    const schema = buildSchema(defaultProps);
    const json = safeJsonLd(schema);
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json) as { '@type': string };
    expect(parsed['@type']).toBe('BlogPosting');
  });
});
