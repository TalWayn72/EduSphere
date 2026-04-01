/* eslint-disable edusphere-design-system/require-page-shell -- multi-section layout */
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  MapPin,
  Clock,
  Laptop,
  DollarSign,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import { PageMeta } from '@/components/seo';
import { PublicLayout } from '@/components/PublicLayout';

const positions = [
  {
    title: 'Senior Full-Stack Engineer',
    desc: 'Build scalable GraphQL Federation services and React interfaces for our knowledge graph platform.',
  },
  {
    title: 'AI/ML Engineer',
    desc: 'Design and optimize RAG pipelines, LangGraph agents, and embedding models for adaptive learning.',
  },
  {
    title: 'Product Designer',
    desc: 'Craft intuitive experiences for educators and learners across web and mobile platforms.',
  },
  {
    title: 'DevOps Engineer',
    desc: 'Manage Kubernetes clusters, CI/CD pipelines, and multi-tenant infrastructure at scale.',
  },
  {
    title: 'Solutions Engineer',
    desc: 'Partner with enterprise customers to deploy and customize EduSphere for their organizations.',
  },
];

const benefits = [
  {
    icon: Laptop,
    label: 'Remote-first',
    detail: 'Work from anywhere in the world',
  },
  {
    icon: DollarSign,
    label: 'Competitive salary',
    detail: 'Top-of-market compensation',
  },
  {
    icon: BookOpen,
    label: 'Learning budget',
    detail: '$2,000/year for courses and conferences',
  },
  {
    icon: TrendingUp,
    label: 'Stock options',
    detail: 'Equity in a growing EdTech company',
  },
];

export function CareersPage() {
  const { t } = useTranslation('common');
  return (
    <PublicLayout navVariant="minimal">
      <PageMeta
        title="Careers | EduSphere"
        description="Join the EduSphere team and help build the future of AI-powered education."
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white py-24 text-center dark:text-white">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            {t('careersPage.heading')}
          </h1>
          <p className="mt-4 text-lg text-indigo-100 dark:text-indigo-300">
            {t('careersPage.subtitle')}
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-slate-50 dark:bg-slate-800">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-center mb-10">
            {t('careersPage.whyJoin')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b) => (
              <div
                key={b.label}
                className="bg-white rounded-xl p-6 shadow-sm text-center dark:bg-gray-900"
              >
                <b.icon className="h-8 w-8 mx-auto text-indigo-600 mb-3 dark:text-indigo-400" />
                <h3 className="font-semibold">{b.label}</h3>
                <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
                  {b.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-center mb-10">
            {t('careersPage.openPositions')}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {positions.map((pos) => (
              <div
                key={pos.title}
                className="border rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-indigo-600 flex-shrink-0 dark:text-indigo-400" />
                  {pos.title}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> Remote
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Full-time
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {pos.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-indigo-50 text-center dark:bg-indigo-950">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-xl font-bold">Don&apos;t see your role?</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Send your resume to{' '}
            <a
              href="mailto:careers@edusphere.dev"
              className="text-indigo-600 underline font-medium dark:text-indigo-400"
            >
              careers@edusphere.dev
            </a>
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}

export default CareersPage;
