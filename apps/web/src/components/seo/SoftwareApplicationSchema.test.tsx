import React from 'react';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect } from 'vitest';
import { SoftwareApplicationSchema } from './SoftwareApplicationSchema';

describe('SoftwareApplicationSchema', () => {
  it('renders without throwing', () => {
    expect(() => render(<HelmetProvider><SoftwareApplicationSchema /></HelmetProvider>)).not.toThrow();
  });

  it('type is SoftwareApplication', () => {
    const schema = { '@type': 'SoftwareApplication' };
    expect(schema['@type']).toBe('SoftwareApplication');
  });
});
