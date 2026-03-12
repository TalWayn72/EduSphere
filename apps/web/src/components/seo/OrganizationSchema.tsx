import { Helmet } from 'react-helmet-async';
import { safeJsonLd } from '@/lib/safe-json-ld';

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'EduSphere',
    url: 'https://app.edusphere.dev',
    logo: 'https://app.edusphere.dev/pwa-512x512.png',
    description:
      'AI-powered learning platform with knowledge graph intelligence, adaptive AI tutoring, and enterprise LMS capabilities.',
    sameAs: [
      'https://twitter.com/edusphere',
      'https://linkedin.com/company/edusphere',
      'https://github.com/edusphere',
    ],
    knowsAbout: [
      'Online Education',
      'AI Tutoring',
      'Knowledge Graphs',
      'Corporate Learning',
      'E-Learning',
      'SCORM',
      'xAPI',
    ],
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      name: 'WCAG 2.2 AA Accessibility Certified',
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{safeJsonLd(schema)}</script>
    </Helmet>
  );
}
