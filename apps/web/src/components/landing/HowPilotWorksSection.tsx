import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Clock, Rocket, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEP_DEFS = [
  { icon: ClipboardList, num: '01', key: 'step01' },
  { icon: Clock, num: '02', key: 'step02' },
  { icon: Rocket, num: '03', key: 'step03' },
];

export function HowPilotWorksSection() {
  const { t } = useTranslation('common');

  return (
    <section
      data-testid="how-pilot-works-section"
      className="bg-indigo-50 py-20 dark:bg-indigo-950"
      aria-label="How the 90-day pilot works"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight dark:text-slate-100">
            {t('landing.howPilotWorks.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            {t('landing.howPilotWorks.subtitle')}
          </p>
        </div>
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {STEP_DEFS.map(({ icon: Icon, num, key }, i) => (
            <React.Fragment key={num}>
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-5 shadow-lg dark:bg-indigo-500 dark:text-white">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1 dark:text-indigo-400">
                  {t('landing.howPilotWorks.step', { num })}
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2 dark:text-slate-100">
                  {t(`landing.howPilotWorks.${key}.title`)}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed max-w-xs dark:text-slate-300">
                  {t(`landing.howPilotWorks.${key}.desc`)}
                </p>
              </div>
              {i < STEP_DEFS.length - 1 && (
                <div
                  className="hidden lg:flex items-center self-center text-indigo-300 dark:text-indigo-400"
                  aria-hidden="true"
                >
                  <ChevronRight className="h-8 w-8" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="text-center mt-12">
          <Button
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-10 dark:bg-indigo-500 dark:text-white"
            asChild
          >
            <Link
              to="/#pilot-cta"
              onClick={(e) => {
                const el = document.getElementById('pilot-cta');
                if (el) {
                  e.preventDefault();
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              {t('landing.howPilotWorks.startYourPilot')}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
