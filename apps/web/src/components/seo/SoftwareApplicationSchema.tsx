import { Helmet } from 'react-helmet-async';
import { safeJsonLd } from '@/lib/safe-json-ld';

export function SoftwareApplicationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'EduSphere',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web, iOS, Android',
    url: 'https://app.edusphere.dev',
    description:
      'AI-powered learning management system with knowledge graph tutoring, gamification, and enterprise features.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        description: 'Access to 100 free courses, basic AI tutor (10 msgs/day)',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '29',
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '29',
          priceCurrency: 'USD',
          unitText: 'MONTH',
        },
        description: 'Unlimited courses, unlimited AI tutor, knowledge graph access',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '12500',
      bestRating: '5',
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{safeJsonLd(schema)}</script>
    </Helmet>
  );
}
