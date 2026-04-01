import React from 'react';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect } from 'vitest';
import { FAQSchema } from './FAQSchema';

describe('FAQSchema', () => {
  const items = [
    { question: 'What is EduSphere?', answer: 'An AI learning platform.' },
    { question: 'Is it free?', answer: 'Yes.' },
  ];

  it('renders without throwing', () => {
    expect(() =>
      render(
        <HelmetProvider>
          <FAQSchema items={items} />
        </HelmetProvider>
      )
    ).not.toThrow();
  });

  it('builds FAQPage schema', () => {
    const schema = {
      '@type': 'FAQPage',
      mainEntity: items.map((i) => ({ name: i.question })),
    };
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(2);
  });
});
