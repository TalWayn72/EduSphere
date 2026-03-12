import { Helmet } from 'react-helmet-async';
import { safeJsonLd } from '@/lib/safe-json-ld';

export interface PersonSchemaProps {
  name: string;
  jobTitle?: string;
  url?: string;
  image?: string;
  worksFor?: string;
  description?: string;
  sameAs?: string[];
}

export function PersonSchema({
  name,
  jobTitle,
  url,
  image,
  worksFor,
  description,
  sameAs = [],
}: PersonSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
  };

  if (jobTitle) schema['jobTitle'] = jobTitle;
  if (url) schema['url'] = url;
  if (image) schema['image'] = image;
  if (description) schema['description'] = description;
  if (sameAs.length > 0) schema['sameAs'] = sameAs;
  if (worksFor) {
    schema['worksFor'] = {
      '@type': 'Organization',
      name: worksFor,
    };
  }

  return (
    <Helmet>
      <script type="application/ld+json">{safeJsonLd(schema)}</script>
    </Helmet>
  );
}
