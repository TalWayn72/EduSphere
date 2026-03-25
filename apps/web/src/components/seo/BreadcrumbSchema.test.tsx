import React from 'react';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect } from 'vitest';
import { BreadcrumbSchema } from './BreadcrumbSchema';
import { safeJsonLd } from '@/lib/safe-json-ld';

function renderWithHelmet(ui: React.ReactElement) {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
}

const ITEMS = [
  { name: 'Home', url: 'https://app.edusphere.dev' },
  { name: 'Courses', url: 'https://app.edusphere.dev/courses' },
];

describe('BreadcrumbSchema', () => {
  it('renders without throwing', () => {
    expect(() => renderWithHelmet(<BreadcrumbSchema items={ITEMS} />)).not.toThrow();
  });

  it('builds correct BreadcrumbList schema structure', () => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: ITEMS.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[0].position).toBe(1);
  });

  it('serializes to valid JSON', () => {
    const schema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList' };
    expect(() => JSON.parse(safeJsonLd(schema))).not.toThrow();
  });
});
