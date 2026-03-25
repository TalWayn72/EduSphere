import React from 'react';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect } from 'vitest';
import { OrganizationSchema } from './OrganizationSchema';

describe('OrganizationSchema', () => {
  it('renders without throwing', () => {
    expect(() => render(<HelmetProvider><OrganizationSchema /></HelmetProvider>)).not.toThrow();
  });

  it('type is EducationalOrganization', () => {
    const schema = { '@type': 'EducationalOrganization', name: 'EduSphere' };
    expect(schema['@type']).toBe('EducationalOrganization');
  });
});
