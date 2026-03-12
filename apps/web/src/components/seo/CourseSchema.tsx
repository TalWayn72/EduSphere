import { Helmet } from 'react-helmet-async';
import { safeJsonLd } from '@/lib/safe-json-ld';

export interface CourseSchemaProps {
  name: string;
  description: string;
  url: string;
  thumbnailUrl?: string;
  provider?: string;
  keywords?: string[];
  inLanguage?: string;
  educationalLevel?: string;
}

export function CourseSchema({
  name,
  description,
  url,
  thumbnailUrl,
  provider = 'EduSphere',
  keywords = [],
  inLanguage = 'en',
  educationalLevel,
}: CourseSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['Course', 'LearningResource'],
    name,
    description,
    url,
    inLanguage,
    provider: {
      '@type': 'Organization',
      name: provider,
      url: 'https://edusphere.dev',
    },
  };

  if (thumbnailUrl) schema['thumbnailUrl'] = thumbnailUrl;
  if (keywords.length > 0) schema['keywords'] = keywords.join(', ');
  if (educationalLevel) schema['educationalLevel'] = educationalLevel;

  return (
    <Helmet>
      <script type="application/ld+json">{safeJsonLd(schema)}</script>
    </Helmet>
  );
}
