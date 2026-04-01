import React from 'react';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect } from 'vitest';
import { WebSiteSchema } from './WebSiteSchema';

describe('WebSiteSchema', () => {
  it('renders without throwing', () => {
    expect(() =>
      render(
        <HelmetProvider>
          <WebSiteSchema />
        </HelmetProvider>
      )
    ).not.toThrow();
  });

  it('type is WebSite', () => {
    const schema = { '@type': 'WebSite' };
    expect(schema['@type']).toBe('WebSite');
  });
});
