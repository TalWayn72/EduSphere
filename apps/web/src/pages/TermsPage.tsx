import { useTranslation } from 'react-i18next';
import { PageMeta } from '@/components/seo';
import { PublicLayout } from '@/components/PublicLayout';

const SECTIONS = [
  { id: 'acceptance', title: '1. Acceptance of Terms', body: 'By accessing or using EduSphere, you agree to be bound by these Terms of Service. If you do not agree, you may not use the platform. Continued use after changes constitutes acceptance of updated terms.' },
  { id: 'description', title: '2. Description of Service', body: 'EduSphere is an AI-Native Learning Management System providing knowledge-graph-powered course creation, adaptive learning paths, real-time collaboration, and AI-assisted pedagogy tools for educational institutions and enterprises.' },
  { id: 'accounts', title: '3. User Accounts and Responsibilities', body: 'You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. You must provide accurate information during registration and promptly update any changes. Notify us immediately of any unauthorized access.' },
  { id: 'ip', title: '4. Intellectual Property', body: 'All platform content, trademarks, and technology are owned by EduSphere or its licensors. User-generated content remains yours; however, you grant EduSphere a license to host and display it within the platform. You may not reverse-engineer, copy, or redistribute any part of the service.' },
  { id: 'acceptable-use', title: '5. Acceptable Use Policy', body: 'You shall not use the service to upload malicious content, violate applicable laws, infringe third-party rights, attempt unauthorized access, or interfere with service operations. AI-generated content must be reviewed for accuracy before distribution.' },
  { id: 'sla', title: '6. Service Level Agreement', body: 'EduSphere targets 99.9% uptime for production environments, measured monthly. Scheduled maintenance windows are announced 48 hours in advance. Service credits may apply for verified downtime exceeding the SLA threshold.' },
  { id: 'liability', title: '7. Limitation of Liability', body: 'To the maximum extent permitted by law, EduSphere shall not be liable for indirect, incidental, special, or consequential damages. Our total liability shall not exceed the amount paid by you in the twelve months preceding the claim.' },
  { id: 'governing-law', title: '8. Governing Law', body: 'These terms are governed by and construed in accordance with applicable law. Any disputes shall be resolved through binding arbitration, unless otherwise required by local consumer protection regulations.' },
] as const;

export function TermsPage() {
  const { t } = useTranslation('common');
  return (
    <PublicLayout navVariant="minimal">
      <PageMeta
        title="Terms of Service | EduSphere"
        description="EduSphere Terms of Service — read our terms and conditions for using the AI-Native LMS platform."
      />

      <div data-testid="terms-page" className="mx-auto max-w-3xl px-6 py-12">
        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('termsPage.heading')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Effective Date: March 2026
          </p>

          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="mt-8">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}

          <section id="contact" className="mt-8">
            <h2 className="text-xl font-semibold">9. Contact</h2>
            <p>
              For questions regarding these terms, contact us at{' '}
              <a href="mailto:legal@edusphere.dev" className="text-blue-600 hover:underline">
                legal@edusphere.dev
              </a>.
            </p>
          </section>
        </article>
      </div>
    </PublicLayout>
  );
}

export default TermsPage;
