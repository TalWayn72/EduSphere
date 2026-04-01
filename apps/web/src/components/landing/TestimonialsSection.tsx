import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';

const TESTIMONIAL_KEYS = [
  { key: 'chen', initials: 'SC' },
  { key: 'torres', initials: 'MT' },
  { key: 'defense', initials: 'TD' },
];

export function TestimonialsSection() {
  const { t } = useTranslation('common');

  return (
    <section
      id="testimonials"
      data-testid="testimonials-section"
      className="bg-slate-50 py-20 dark:bg-slate-800"
      aria-label="Customer testimonials"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight dark:text-slate-100">
            {t('landing.testimonials.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto dark:text-slate-400">
            {t('landing.testimonials.subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIAL_KEYS.map((item) => (
            <Card
              key={item.key}
              className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow dark:bg-gray-900 dark:border-slate-600"
            >
              <CardContent className="pt-7 pb-6">
                {/* Large indigo quote mark */}
                <div
                  className="text-5xl leading-none text-indigo-200 font-serif mb-4 select-none dark:text-indigo-300"
                  aria-hidden="true"
                >
                  &ldquo;
                </div>
                <p className="text-slate-600 leading-relaxed text-sm mb-6 italic dark:text-slate-300">
                  {t(`landing.testimonials.${item.key}.quote`)}
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div
                    className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 dark:bg-indigo-500 dark:text-white"
                    aria-hidden="true"
                  >
                    {item.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm dark:text-slate-100">
                      {t(`landing.testimonials.${item.key}.name`)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t(`landing.testimonials.${item.key}.role`)},{' '}
                      {t(`landing.testimonials.${item.key}.org`)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
