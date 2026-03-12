import { Helmet } from 'react-helmet-async';
import { safeJsonLd } from '@/lib/safe-json-ld';

const BASE_URL = 'https://app.edusphere.dev';

export interface ArticleSchemaProps {
  title: string;
  description: string;
  slug: string;
  author: string;
  authorUrl: string;
  datePublished: string;
  dateModified: string;
  keywords: string[];
  category: string;
  readingTimeMinutes: number;
}

export function ArticleSchema({
  title,
  description,
  slug,
  author,
  authorUrl,
  datePublished,
  dateModified,
  keywords,
  category,
  readingTimeMinutes,
}: ArticleSchemaProps) {
  const articleUrl = `${BASE_URL}/blog/${slug}`;
  const encodedTitle = encodeURIComponent(title);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    url: articleUrl,
    datePublished,
    dateModified,
    keywords: keywords.join(', '),
    inLanguage: 'en',
    timeRequired: `PT${readingTimeMinutes}M`,
    articleSection: category,
    publisher: {
      '@type': 'Organization',
      name: 'EduSphere',
      url: 'https://edusphere.dev',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/pwa-512x512.png`,
      },
    },
    author: {
      '@type': 'Person',
      name: author,
      url: authorUrl,
    },
    image: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/aeo/og?title=${encodedTitle}&type=blog`,
      width: 1200,
      height: 630,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{safeJsonLd(schema)}</script>
    </Helmet>
  );
}
