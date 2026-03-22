import { useTranslation } from 'react-i18next';
import { PageMeta } from '@/components/seo';
import { PublicLayout } from '@/components/PublicLayout';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'We collect information you provide directly, such as your name, email address, institution affiliation, and course-related data. We also automatically collect usage data including device information, IP addresses, and interaction analytics to improve the platform experience.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'Your information is used to deliver and personalize educational content, power AI-driven learning recommendations, maintain platform security, communicate important updates, and conduct research to improve our services. We process data under lawful bases including consent, contract performance, and legitimate interest.',
  },
  {
    title: '3. Data Sharing and Disclosure',
    body: 'We do not sell your personal data. Information may be shared with your educational institution as required, trusted service providers operating under strict data processing agreements, and authorities when legally required. All third-party processors are vetted for GDPR and FERPA compliance.',
  },
  {
    title: '4. Data Retention',
    body: 'Personal data is retained only as long as necessary for the purposes described in this policy. Course data is retained for the duration of your enrollment plus a reasonable period. You may request deletion at any time, subject to legal retention obligations.',
  },
  {
    title: '5. Your Rights',
    body: 'Under GDPR, you have the right to access, rectify, erase, restrict processing, data portability, and object to processing of your personal data. Under FERPA, eligible students have the right to inspect education records and request amendments. To exercise these rights, contact us at privacy@edusphere.dev.',
  },
  {
    title: '6. Cookies',
    body: 'We use essential cookies for authentication and platform functionality, and optional analytics cookies to understand usage patterns. You can manage cookie preferences through your browser settings. The platform functions fully with only essential cookies enabled.',
  },
  {
    title: '7. Children\'s Privacy',
    body: 'EduSphere is designed for users aged 16 and above. We do not knowingly collect personal data from children under 16. If we discover such data has been collected, it will be promptly deleted. Institutions deploying EduSphere for younger learners must obtain appropriate parental consent.',
  },
  {
    title: '8. Contact Us',
    body: 'For privacy-related inquiries, data subject requests, or to report concerns, please contact our Data Protection Officer at privacy@edusphere.dev.',
  },
] as const;

export function PrivacyPage() {
  const { t } = useTranslation('common');
  return (
    <PublicLayout navVariant="minimal">
      <PageMeta
        title="Privacy Policy"
        description="EduSphere Privacy Policy — how we collect, use, and protect your data."
      />

      <div data-testid="privacy-page" className="mx-auto w-full max-w-3xl px-6 py-12">
        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h1>{t('privacyPage.heading')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('privacyPage.lastUpdated')}: March 2026</p>
          <p>
            EduSphere (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your
            privacy. This policy explains how we collect, use, and safeguard your personal
            information when you use our knowledge-graph educational platform.
          </p>

          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </article>
      </div>
    </PublicLayout>
  );
}

export default PrivacyPage;
