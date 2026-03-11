import { Helmet } from 'react-helmet-async';

interface PageMetaProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
}

const BASE_URL = 'https://app.edusphere.dev';
const DEFAULT_OG_IMAGE = `${BASE_URL}/pwa-512x512.png`;

export function PageMeta({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noIndex = false,
}: PageMetaProps) {
  const fullTitle = `${title} | EduSphere`;
  const canonicalUrl =
    canonical ?? (typeof window !== 'undefined' ? window.location.href : BASE_URL);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noIndex ? 'noindex, follow' : 'index, follow'} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
