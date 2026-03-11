import { describe, it, expect } from 'vitest';
import { safeJsonLd } from './safe-json-ld';

describe('safeJsonLd', () => {
  it('serializes a simple object to JSON', () => {
    const result = safeJsonLd({ name: 'EduSphere' });
    expect(result).toBe('{"name":"EduSphere"}');
  });

  it('escapes </script> injection vector', () => {
    const malicious = { name: '</script><script>alert("xss")</script>' };
    const result = safeJsonLd(malicious);
    expect(result).not.toContain('</script>');
    expect(result).toContain('<\\/script>');
  });

  it('escapes </ in nested objects', () => {
    const nested = { mainEntity: [{ text: 'Test </div> content' }] };
    const result = safeJsonLd(nested);
    expect(result).not.toContain('</div>');
    expect(result).toContain('<\\/div>');
  });

  it('produces valid JSON that can be parsed back', () => {
    const schema = { '@context': 'https://schema.org', '@type': 'FAQPage' };
    const result = safeJsonLd(schema);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('handles arrays', () => {
    const schema = { steps: ['Step 1', 'Step </script> 2'] };
    const result = safeJsonLd(schema);
    expect(result).not.toContain('</script>');
  });
});
