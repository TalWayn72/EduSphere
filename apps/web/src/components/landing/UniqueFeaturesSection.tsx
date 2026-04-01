import React from 'react';
import { useTranslation } from 'react-i18next';
import { Network, Image, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const FEATURE_KEYS = [
  {
    icon: Network,
    key: 'knowledgeGraph',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  {
    icon: Image,
    key: 'visualAnchoring',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  {
    icon: Zap,
    key: 'aiCourseBuilder',
    badgeColor: 'bg-green-100 text-green-700 border-green-200',
  },
];

export function UniqueFeaturesSection() {
  const { t } = useTranslation('common');

  return (
    <section
      id="features"
      data-testid="unique-features-section"
      className="bg-white py-20 dark:bg-gray-900"
      aria-label="Unique features"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight dark:text-slate-100">
            {t('landing.features.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto dark:text-slate-400">
            {t('landing.features.subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURE_KEYS.map(({ icon: Icon, key, badgeColor }) => (
            <div
              key={key}
              className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow dark:bg-gray-900 dark:border-slate-600"
            >
              {/* Indigo gradient top border */}
              <div
                className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"
                aria-hidden="true"
              />
              <div className="p-7">
                <div className="p-3 rounded-xl bg-indigo-50 inline-flex mb-5 dark:bg-indigo-950">
                  <Icon
                    className="h-7 w-7 text-indigo-600 dark:text-indigo-400"
                    aria-hidden="true"
                  />
                </div>
                <div className="mb-3">
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold mb-3 ${badgeColor}`}
                  >
                    {t(`landing.features.${key}.badge`)}
                  </Badge>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 dark:text-slate-100">
                  {t(`landing.features.${key}.title`)}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4 dark:text-slate-400">
                  {t(`landing.features.${key}.desc`)}
                </p>
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 dark:bg-slate-800">
                  <span
                    className="text-green-600 font-bold text-sm dark:text-green-400"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t(`landing.features.${key}.detail`)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
