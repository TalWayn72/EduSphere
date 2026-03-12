import { Helmet } from 'react-helmet-async';
import { safeJsonLd } from '@/lib/safe-json-ld';

export interface HowToStep {
  name: string;
  text: string;
  url?: string;
}

export interface HowToSchemaProps {
  name: string;
  description: string;
  steps: HowToStep[];
  /** ISO 8601 duration, e.g. "PT30M" */
  totalTime?: string;
}

export function HowToSchema({
  name,
  description,
  steps,
  totalTime,
}: HowToSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((s, i) => {
      const step: Record<string, unknown> = {
        '@type': 'HowToStep',
        position: i + 1,
        name: s.name,
        text: s.text,
      };
      if (s.url) step['url'] = s.url;
      return step;
    }),
  };

  if (totalTime) schema['totalTime'] = totalTime;

  return (
    <Helmet>
      <script type="application/ld+json">{safeJsonLd(schema)}</script>
    </Helmet>
  );
}
