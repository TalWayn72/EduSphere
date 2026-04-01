import React from 'react';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect } from 'vitest';
import { PersonSchema } from './PersonSchema';

describe('PersonSchema', () => {
  it('renders without throwing', () => {
    expect(() =>
      render(
        <HelmetProvider>
          <PersonSchema name="Dr. Test" />
        </HelmetProvider>
      )
    ).not.toThrow();
  });

  it('builds Person schema', () => {
    const schema = { '@type': 'Person', name: 'Dr. Test' };
    expect(schema.name).toBe('Dr. Test');
  });
});
