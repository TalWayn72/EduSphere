import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, ShieldCheck, Accessibility, BookOpen } from 'lucide-react';
import { PageMeta } from '@/components/seo';
import { PublicLayout } from '@/components/PublicLayout';

const TEAM = [
  { name: 'Sarah Cohen', role: 'CEO', initials: 'SC' },
  { name: 'David Levy', role: 'CTO', initials: 'DL' },
  { name: 'Maya Rosen', role: 'VP Product', initials: 'MR' },
  { name: 'Amit Shapira', role: 'VP Engineering', initials: 'AS' },
] as const;

const STAT_KEYS = ['founded', 'employees', 'institutions', 'learners'] as const;
const STAT_VALUES = ['2024', '50+', '200+', '100K+'] as const;

const VALUE_KEYS = ['innovation', 'accessibility', 'privacyFirst', 'openStandards'] as const;
const VALUE_ICONS = [Lightbulb, Accessibility, ShieldCheck, BookOpen] as const;

export function AboutPage() {
  const { t } = useTranslation('common');
  return (
    <PublicLayout navVariant="minimal">
      <PageMeta
        title="About EduSphere — AI-Native Learning Platform"
        description="Learn about EduSphere's mission to democratize education through AI and Knowledge Graphs."
        canonical="/about"
      />

      <div className="dark:bg-slate-900">
        {/* Hero */}
        <section aria-labelledby="about-heading" className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800 py-20 text-center">
          <div className="max-w-3xl mx-auto px-4">
            <h1 id="about-heading" className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">{t('about.heading')}</h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">{t('about.heroSubtitle')}</p>
          </div>
        </section>

        {/* Mission */}
        <section aria-labelledby="mission-heading" className="max-w-4xl mx-auto px-4 py-16">
          <h2 id="mission-heading" className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{t('about.missionHeading')}</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('about.missionText')}
          </p>
        </section>

        {/* Stats */}
        <section aria-label="Company statistics" className="bg-indigo-600 py-12">
          <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {STAT_KEYS.map((key, i) => (
              <div key={key}>
                <p className="text-3xl font-extrabold text-white">{STAT_VALUES[i]}</p>
                <p className="text-indigo-100 text-sm mt-1">{t(`about.stats.${key}`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section aria-labelledby="team-heading" className="max-w-5xl mx-auto px-4 py-16">
          <h2 id="team-heading" className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">{t('about.teamHeading')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {TEAM.map((m) => (
              <article key={m.name} className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-3" aria-hidden="true">
                  <span className="text-indigo-600 font-bold text-lg">{m.initials}</span>
                </div>
                <p className="font-semibold text-slate-900 dark:text-white">{m.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-300">{m.role}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Values */}
        <section aria-labelledby="values-heading" className="bg-slate-50 dark:bg-slate-900 py-16">
          <div className="max-w-5xl mx-auto px-4">
            <h2 id="values-heading" className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">{t('about.valuesHeading')}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {VALUE_KEYS.map((key, i) => {
                const Icon = VALUE_ICONS[i] as typeof VALUE_ICONS[number];
                return (
                  <div key={key} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                    <Icon className="h-8 w-8 text-indigo-600 mb-3" aria-hidden="true" />
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{t(`about.values.${key}`)}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{t(`about.values.${key}Desc`)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

export default AboutPage;
