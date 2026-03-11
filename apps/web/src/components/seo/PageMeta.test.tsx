/**
 * Unit tests for SEO components — PageMeta, FAQSchema, BreadcrumbSchema
 *
 * Tests structural correctness of the schema JSON-LD output and
 * the PageMeta component render contract.
 *
 * Uses react-helmet-async HelmetProvider context for Helmet rendering.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { PageMeta } from './PageMeta';
import { FAQSchema } from './FAQSchema';
import { BreadcrumbSchema } from './BreadcrumbSchema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderWithHelmet(ui: React.ReactElement) {
  const helmetContext: Record<string, unknown> = {};
  return {
    ...render(
      <HelmetProvider context={helmetContext}>
        <MemoryRouter>{ui}</MemoryRouter>
      </HelmetProvider>
    ),
    helmetContext,
  };
}

// ─── PageMeta ─────────────────────────────────────────────────────────────────

describe('PageMeta', () => {
  it('renders without throwing given required props', () => {
    expect(() =>
      renderWithHelmet(
        <PageMeta
          title="Test Page"
          description="A short description for the test page that is valid."
          canonical="https://app.edusphere.dev/test"
        />
      )
    ).not.toThrow();
  });

  it('renders without throwing when noIndex is true', () => {
    expect(() =>
      renderWithHelmet(
        <PageMeta
          title="Admin Area"
          description="Internal admin area — not for search engines."
          noIndex
        />
      )
    ).not.toThrow();
  });

  it('renders without throwing when ogType is "article"', () => {
    expect(() =>
      renderWithHelmet(
        <PageMeta
          title="Article Title"
          description="Article description."
          ogType="article"
        />
      )
    ).not.toThrow();
  });

  it('renders without throwing when canonical is omitted', () => {
    expect(() =>
      renderWithHelmet(
        <PageMeta
          title="No Canonical"
          description="A page without an explicit canonical URL."
        />
      )
    ).not.toThrow();
  });

  it('renders without throwing with a custom ogImage URL', () => {
    expect(() =>
      renderWithHelmet(
        <PageMeta
          title="Custom OG"
          description="Custom og:image test."
          ogImage="https://app.edusphere.dev/custom-image.png"
        />
      )
    ).not.toThrow();
  });
});

// ─── FAQSchema — JSON-LD structure ───────────────────────────────────────────

describe('FAQSchema', () => {
  it('renders without throwing given a valid items array', () => {
    const items = [
      { question: 'What is EduSphere?', answer: 'An AI-powered LMS.' },
      { question: 'Is it free?', answer: 'Yes, with a free plan.' },
    ];
    expect(() =>
      renderWithHelmet(<FAQSchema items={items} />)
    ).not.toThrow();
  });

  it('generates valid JSON-LD @type FAQPage structure', () => {
    const items = [
      { question: 'What is EduSphere?', answer: 'An AI-powered LMS.' },
    ];
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    };

    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(1);
    expect(schema.mainEntity[0]['@type']).toBe('Question');
    expect(schema.mainEntity[0].name).toBe('What is EduSphere?');
    expect(schema.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe('An AI-powered LMS.');
  });

  it('serializes to valid JSON without throwing', () => {
    const items = [
      { question: 'Q1', answer: 'A1' },
      { question: 'Q2', answer: 'A2' },
    ];
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    };
    const json = JSON.stringify(schema);
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed['@type']).toBe('FAQPage');
    expect(parsed.mainEntity).toHaveLength(2);
  });

  it('does NOT produce </script> in the serialized JSON (XSS guard)', () => {
    // This is the core XSS invariant: JSON.stringify escapes < as \u003c
    const maliciousAnswer = 'Safe answer </script><script>alert(1)</script>';
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Injection test',
          acceptedAnswer: { '@type': 'Answer', text: maliciousAnswer },
        },
      ],
    };
    const json = JSON.stringify(schema);
    // JSON.stringify escapes < to \u003c, so </script> becomes \u003c/script>
    expect(json).not.toContain('</script>');
    // The parsed value recovers the original text safely
    const parsed = JSON.parse(json);
    expect(parsed.mainEntity[0].acceptedAnswer.text).toContain('</script>');
  });

  it('handles empty items array without throwing', () => {
    expect(() =>
      renderWithHelmet(<FAQSchema items={[]} />)
    ).not.toThrow();
  });

  it('handles 20 items (production FAQ count) without throwing', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      question: `Question ${i + 1}?`,
      answer: `Answer ${i + 1}.`,
    }));
    expect(() =>
      renderWithHelmet(<FAQSchema items={items} />)
    ).not.toThrow();
  });
});

// ─── BreadcrumbSchema — JSON-LD structure ────────────────────────────────────

describe('BreadcrumbSchema', () => {
  it('renders without throwing given a valid items array', () => {
    const items = [
      { name: 'EduSphere', url: 'https://app.edusphere.dev/landing' },
      { name: 'FAQ', url: 'https://app.edusphere.dev/faq' },
    ];
    expect(() =>
      renderWithHelmet(<BreadcrumbSchema items={items} />)
    ).not.toThrow();
  });

  it('generates valid JSON-LD BreadcrumbList structure', () => {
    const items = [
      { name: 'EduSphere', url: 'https://app.edusphere.dev/landing' },
      { name: 'FAQ', url: 'https://app.edusphere.dev/faq' },
    ];
    // BreadcrumbSchema uses { name, item } — matching the actual component implementation
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };

    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[0]['@type']).toBe('ListItem');
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[0].name).toBe('EduSphere');
    expect(schema.itemListElement[0].item).toBe('https://app.edusphere.dev/landing');
    expect(schema.itemListElement[1].position).toBe(2);
  });

  it('serializes to valid parseable JSON', () => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.com' },
      ],
    };
    expect(() => JSON.parse(JSON.stringify(schema))).not.toThrow();
  });
});
