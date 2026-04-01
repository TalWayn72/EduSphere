import React from 'react';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect } from 'vitest';
import { HowToSchema } from './HowToSchema';

describe('HowToSchema', () => {
  const steps = [
    { name: 'Sign Up', text: 'Create account' },
    { name: 'Browse', text: 'Find course' },
  ];

  it('renders without throwing', () => {
    expect(() =>
      render(
        <HelmetProvider>
          <HowToSchema name="Start" description="How" steps={steps} />
        </HelmetProvider>
      )
    ).not.toThrow();
  });

  it('builds HowTo schema', () => {
    const schema = {
      '@type': 'HowTo',
      step: steps.map((s, i) => ({ position: i + 1, name: s.name })),
    };
    expect(schema['@type']).toBe('HowTo');
    expect(schema.step).toHaveLength(2);
  });
});
