import React from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, Network, Trophy, Shield, Globe, Zap, Check } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import {
  PageMeta,
  BreadcrumbSchema,
  OrganizationSchema,
  SoftwareApplicationSchema,
} from '@/components/seo';
import { safeJsonLd } from '@/lib/safe-json-ld';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/PublicLayout';

interface HowToStep {
  step: number;
  title: string;
  desc: string;
}

interface Feature {
  id: string;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  i18nKey: string;
  title: string;
  tagline: string;
  description: string;
  benefits: string[];
  howItWorks: HowToStep[];
}

const FEATURE_DEFS = [
  { id: 'ai-tutor', Icon: Brain, i18nKey: 'aiTutor' },
  { id: 'knowledge-graph', Icon: Network, i18nKey: 'knowledgeGraph' },
  { id: 'gamification', Icon: Trophy, i18nKey: 'gamification' },
  { id: 'enterprise', Icon: Shield, i18nKey: 'enterprise' },
  { id: 'multilingual', Icon: Globe, i18nKey: 'multilingual' },
  { id: 'live-sessions', Icon: Zap, i18nKey: 'liveSessions' },
] as const;

function useFeatures(): Feature[] {
  const { t } = useTranslation('common');
  return FEATURE_DEFS.map((def) => {
    const steps = t(`features.${def.i18nKey}.steps`, { returnObjects: true, defaultValue: [] });
    const benefits = t(`features.${def.i18nKey}.benefits`, { returnObjects: true, defaultValue: [] });
    return {
      id: def.id,
      Icon: def.Icon,
      i18nKey: def.i18nKey,
      title: t(`features.${def.i18nKey}.title`),
      tagline: t(`features.${def.i18nKey}.tagline`),
      description: t(`features.${def.i18nKey}.description`),
      benefits: Array.isArray(benefits) ? benefits as string[] : [],
      howItWorks: Array.isArray(steps)
        ? (steps as { title: string; desc: string }[]).map((s, i) => ({ step: i + 1, title: s.title, desc: s.desc }))
        : [],
    };
  });
}

export function FeaturesPage() {
  const { t } = useTranslation('common');
  const FEATURES = useFeatures();
  const howToSchemas = FEATURES.filter((f) => f.howItWorks.length > 0).map((feature) => ({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How ${feature.title} Works in EduSphere`,
    description: feature.description,
    step: feature.howItWorks.map((s) => ({
      '@type': 'HowToStep',
      position: s.step,
      name: s.title,
      text: s.desc,
    })),
  }));

  return (
    <>
      <PageMeta
        title="Features — AI Tutoring, Knowledge Graph, Gamification & More"
        description="Explore EduSphere's features: AI tutoring (Chavruta), knowledge graph, gamification, enterprise LMS, multi-language support, and live sessions. Built for 100,000+ concurrent users."
        canonical="https://app.edusphere.dev/features"
      />
      <Helmet>
        {howToSchemas.map((schema, i) => (
          <script key={i} type="application/ld+json">
            {safeJsonLd(schema)}
          </script>
        ))}
      </Helmet>
      <BreadcrumbSchema
        items={[
          { name: 'EduSphere', url: 'https://app.edusphere.dev/landing' },
          { name: 'Features', url: 'https://app.edusphere.dev/features' },
        ]}
      />
      <OrganizationSchema />
      <SoftwareApplicationSchema />

      <PublicLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              {t('features.pageHeading')}
            </h1>
            <p className="text-lg text-gray-500 dark:text-slate-300 max-w-2xl mx-auto mb-8">
              {t('features.pageSubheading')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/login">{t('features.getStartedFree')}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/faq">{t('features.viewFaq')}</Link>
              </Button>
            </div>
          </div>
        </div>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
          {FEATURES.map((feature, i) => (
            <section
              key={feature.id}
              id={feature.id}
              aria-labelledby={`feature-title-${feature.id}`}
              className="scroll-mt-8"
            >
              <div
                className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}
              >
                {/* Text */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950">
                      <feature.Icon
                        className="h-6 w-6 text-indigo-600"
                        aria-hidden={true}
                      />
                    </div>
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      {feature.tagline}
                    </span>
                  </div>
                  <h2
                    id={`feature-title-${feature.id}`}
                    className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4"
                  >
                    {feature.title}
                  </h2>
                  <p className="text-gray-600 dark:text-slate-300 leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.benefits.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-sm text-gray-700 dark:text-white"
                      >
                        <Check
                          className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0"
                          aria-hidden={true}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* How it Works */}
                {feature.howItWorks.length > 0 && (
                  <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">
                      {t('features.howItWorks')}
                    </h3>
                    <ol className="space-y-4">
                      {feature.howItWorks.map((s) => (
                        <li key={s.step} className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {s.step}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                              {s.title}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-slate-400">
                              {s.desc}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </section>
          ))}
        </main>

        {/* CTA */}
        <div className="bg-indigo-700 py-16 text-center text-white">
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-3xl font-extrabold mb-4">{t('features.ctaHeading')}</h2>
            <p className="text-indigo-100 mb-8">
              {t('features.ctaSubtext')}
            </p>
            <Button
              size="lg"
              className="bg-white text-indigo-700 hover:bg-indigo-50"
              asChild
            >
              <Link to="/login">{t('features.getStartedFree')}</Link>
            </Button>
          </div>
        </div>
      </div>
      </PublicLayout>
    </>
  );
}

export default FeaturesPage;
