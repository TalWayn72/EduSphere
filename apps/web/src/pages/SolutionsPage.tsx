import { Link } from 'react-router-dom';
import { Brain, GraduationCap, Building2, Shield, BookOpen } from 'lucide-react';
import { PageMeta } from '@/components/seo';
import { LandingFooter } from '@/components/landing/LandingFooter';

interface Solution {
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  title: string;
  description: string;
  features: string[];
}

const SOLUTIONS: Solution[] = [
  {
    Icon: GraduationCap,
    title: 'Universities',
    description: 'AI-powered tutoring with knowledge graphs that map every concept across your curriculum.',
    features: ['AI tutoring & Socratic debate', 'Knowledge graph curriculum mapping', 'FERPA-compliant data handling', 'LTI & SIS integration'],
  },
  {
    Icon: Building2,
    title: 'Enterprises',
    description: 'Close skills gaps with adaptive training paths and real-time workforce analytics.',
    features: ['Skills gap analysis dashboards', 'Compliance training automation', 'HRIS / SCIM integration', 'Custom branding & SSO'],
  },
  {
    Icon: Shield,
    title: 'Government & Defense',
    description: 'Deploy on-premises or air-gapped with the highest security standards built in.',
    features: ['Air-gapped deployment option', 'Security clearance workflows', 'ITAR / FedRAMP alignment', 'Audit-ready logging'],
  },
  {
    Icon: BookOpen,
    title: 'Training Companies',
    description: 'White-label the platform, launch a marketplace, and grow revenue with built-in commerce.',
    features: ['White-label branding', 'Course marketplace & storefronts', 'Revenue share & payouts', 'SCORM / xAPI export'],
  },
];

export function SolutionsPage() {
  return (
    <div data-testid="solutions-page" className="min-h-screen bg-gray-50">
      <PageMeta title="Solutions | EduSphere" description="EduSphere solutions for universities, enterprises, government, and training companies." />
      <nav className="border-b bg-white px-6 py-4" aria-label="Solutions page navigation">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-indigo-600">
          <Brain className="h-6 w-6" aria-hidden="true" />
          EduSphere
        </Link>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="mb-4 text-center text-4xl font-bold text-gray-900">Solutions for Every Sector</h1>
        <p className="mx-auto mb-12 max-w-2xl text-center text-lg text-gray-600">
          From higher education to defense — EduSphere adapts to your compliance, scale, and integration needs.
        </p>

        <div className="grid gap-8 md:grid-cols-2">
          {SOLUTIONS.map(({ Icon, title, description, features }) => (
            <article key={title} className="flex flex-col rounded-xl bg-white p-8 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                  <Icon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              </div>
              <p className="mb-4 text-gray-600">{description}</p>
              <ul className="mb-6 flex-1 space-y-2">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/#pilot-cta"
                className="inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-center font-semibold text-white hover:bg-indigo-700"
              >
                Start a Pilot
              </Link>
            </article>
          ))}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

export default SolutionsPage;
