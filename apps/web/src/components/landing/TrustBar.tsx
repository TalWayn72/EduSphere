import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';

const BADGES = [
  'FERPA',
  'WCAG 2.2 AA',
  'SCORM 2004',
  'LTI 1.3',
  'xAPI',
  'SAML 2.0',
  'GDPR',
];

const PLACEHOLDER_COUNT = 5;

export function TrustBar() {
  const { t } = useTranslation('common');

  return (
    <section
      data-testid="trust-bar"
      className="bg-white border-b border-slate-100 py-8 dark:bg-gray-900 dark:border-slate-700"
      aria-label="Trust indicators"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6 dark:text-slate-400">
          {t('landing.trustBar.tagline')}
        </p>
        {/* Compliance mini-badges */}
        <div
          className="flex flex-wrap justify-center gap-2 mb-8"
          role="list"
          aria-label="Compliance certifications"
        >
          {BADGES.map((badge) => (
            <div
              key={badge}
              role="listitem"
              className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
            >
              <Shield
                className="h-3 w-3 text-indigo-600 dark:text-indigo-400"
                aria-hidden="true"
              />
              {badge}
            </div>
          ))}
        </div>
        {/* Logo placeholder grid */}
        <div
          className="flex flex-wrap justify-center gap-6"
          role="list"
          aria-label="Partner organizations"
        >
          {Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
            <div
              key={i}
              role="listitem"
              className="w-32 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-medium"
              aria-label={t('landing.trustBar.universityPartner')}
            >
              {t('landing.trustBar.universityPartner')}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
