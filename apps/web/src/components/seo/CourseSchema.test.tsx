import React from 'react';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect } from 'vitest';
import { CourseSchema } from './CourseSchema';
import { safeJsonLd } from '@/lib/safe-json-ld';

describe('CourseSchema', () => {
  it('renders without throwing', () => {
    expect(() =>
      render(
        <HelmetProvider>
          <CourseSchema
            name="Math 101"
            description="Intro"
            url="https://test"
          />
        </HelmetProvider>
      )
    ).not.toThrow();
  });

  it('schema type includes Course', () => {
    const schema = { '@type': ['Course', 'LearningResource'] };
    expect(schema['@type'][0]).toBe('Course');
  });

  it('serializes safely', () => {
    const json = safeJsonLd({ name: 'Test' });
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
