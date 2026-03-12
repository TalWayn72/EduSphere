import React from 'react';
import { safeJsonLd } from '@/lib/safe-json-ld';

interface JsonLdProps {
  schema: Record<string, unknown>;
}

/**
 * Renders a JSON-LD structured data script tag.
 * Uses safeJsonLd to prevent </script> injection attacks.
 */
export function JsonLd({ schema }: JsonLdProps) {
  return (
    <div data-testid="json-ld-script">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
      />
    </div>
  );
}
