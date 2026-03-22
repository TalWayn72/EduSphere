import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEP_KEYS = [
  { num: 1, key: 'step1' },
  { num: 2, key: 'step2' },
  { num: 3, key: 'step3' },
  { num: 4, key: 'step4' },
  { num: 5, key: 'step5' },
];

// 5 instructors × 8 hrs/week × 52 weeks × 60% reduction
const ANNUAL_HOURS_SAVED = 5 * 8 * 52 * 0.6;

function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = null;
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.round(progress * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return count;
}

export function AICourseBuildSection() {
  const { t } = useTranslation('common');
  const count = useCountUp(ANNUAL_HOURS_SAVED);

  return (
    <section
      id="ai-course-builder"
      data-testid="ai-course-build-section"
      className="bg-slate-900 py-20 text-white dark:bg-slate-100 dark:text-white"
      aria-label="AI Course Builder"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-4 py-1.5 text-sm font-medium text-indigo-100 mb-6 dark:bg-indigo-400/20 dark:border-indigo-500/30 dark:text-indigo-300">
            <Zap className="h-4 w-4" aria-hidden="true" />
            {t('landing.aiCourseBuild.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {t('landing.aiCourseBuild.title')}
          </h2>
          <p className="mt-4 text-slate-300 text-lg max-w-2xl mx-auto dark:text-slate-600">
            {t('landing.aiCourseBuild.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Steps */}
          <ol className="space-y-4" aria-label="AI Course Builder steps">
            {STEP_KEYS.map((step) => (
              <li
                key={step.num}
                className="flex items-center gap-4 bg-white/5 border border-white/20 rounded-xl px-5 py-4"
              >
                <span
                  className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 dark:bg-indigo-500 dark:text-white"
                  aria-hidden="true"
                >
                  {step.num}
                </span>
                <span className="text-slate-200 text-sm font-medium dark:text-slate-700">{t(`landing.aiCourseBuild.${step.key}`)}</span>
              </li>
            ))}
          </ol>

          {/* Counter */}
          <div className="text-center lg:text-left">
            <div className="bg-white/5 border border-white/20 rounded-2xl p-8">
              <p className="text-sm text-slate-300 font-medium mb-2 uppercase tracking-wider dark:text-slate-600">
                {t('landing.aiCourseBuild.estimatedHoursSaved')}
              </p>
              <div
                className="text-6xl font-extrabold text-indigo-400 mb-1 dark:text-indigo-300"
                aria-live="polite"
                aria-label={`${count} ${t('landing.aiCourseBuild.hoursPerYear')}`}
              >
                {count.toLocaleString()}
              </div>
              <p className="text-slate-300 text-sm dark:text-slate-600">{t('landing.aiCourseBuild.hoursPerYear')}</p>
              <p className="mt-4 text-xs text-slate-300 dark:text-slate-600">
                {t('landing.aiCourseBuild.basedOn')}
              </p>
            </div>
            <div className="mt-6">
              <Button
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold w-full lg:w-auto dark:bg-indigo-500 dark:text-white"
                asChild
              >
                <Link to="/#pilot-cta" onClick={(e) => { const el = document.getElementById('pilot-cta'); if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); } }}>{t('landing.aiCourseBuild.seeDemo')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
