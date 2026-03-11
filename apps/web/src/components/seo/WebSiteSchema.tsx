import { Helmet } from 'react-helmet-async';
import { safeJsonLd } from '@/lib/safe-json-ld';

export function WebSiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'EduSphere',
    url: 'https://app.edusphere.dev',
    description:
      'AI-powered knowledge graph learning platform for individuals and enterprises.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://app.edusphere.dev/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{safeJsonLd(schema)}</script>
    </Helmet>
  );
}
