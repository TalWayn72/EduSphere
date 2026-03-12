import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { JsonLd } from './JsonLd';

describe('JsonLd', () => {
  it('renders wrapper with data-testid="json-ld-script"', () => {
    const schema = { '@context': 'https://schema.org', '@type': 'Organization' };
    render(<JsonLd schema={schema} />);
    expect(screen.getByTestId('json-ld-script')).toBeInTheDocument();
  });

  it('does not expose raw </script> break-out sequence in the JSON payload', () => {
    const malicious = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      description: '</script><script>alert(1)</script>',
    };
    const { container } = render(<JsonLd schema={malicious} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();
    // safeJsonLd escapes </ → <\/ in the JSON string
    // The textContent (the raw JSON payload) must NOT contain an unescaped </
    // which would allow the injected string to break out of the script tag
    const payload = script?.textContent ?? '';
    expect(payload).not.toContain('</script>');
    // The escaped form should be present instead
    expect(payload).toContain('<\\/script>');
  });

  it('includes schema type in the script content', () => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'PriceSpecification',
      name: 'EduSphere Starter Plan',
    };
    const { container } = render(<JsonLd schema={schema} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();
    expect(script?.textContent).toContain('PriceSpecification');
    expect(script?.textContent).toContain('EduSphere Starter Plan');
  });
});
