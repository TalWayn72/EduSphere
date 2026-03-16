import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PricingSection } from '@/components/landing/PricingSection';
import { ComplianceBadgesSection } from '@/components/landing/ComplianceBadgesSection';
import { VsCompetitorsSection } from '@/components/landing/VsCompetitorsSection';
import { PublicLayout } from '@/components/PublicLayout';

const FAQ_ITEMS = [
  {
    q: 'What is a Yearly Active User (YAU)?',
    a: 'A YAU is any user who logs in at least once per calendar year. Inactive accounts don\'t count.',
  },
  {
    q: 'Is white-label included on all plans?',
    a: 'Yes. Every tier includes full white-label branding at no extra cost.',
  },
  {
    q: 'Can I upgrade mid-year?',
    a: 'Yes. Contact us and we\'ll prorate the difference.',
  },
  {
    q: 'What happens when my pilot expires?',
    a: 'Your data is preserved. You can upgrade to a paid plan or export your data.',
  },
];

export function PricingPage() {
  usePageTitle('Pricing & Plans');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <PublicLayout>
    <div data-testid="pricing-page" className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Hero */}
      <div className="bg-white dark:bg-slate-800 py-14 text-center px-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Pricing &amp; Plans
        </h1>
        <p className="mt-4 text-lg text-slate-500 dark:text-slate-300 max-w-xl mx-auto">
          Transparent YAU-based pricing. No per-module fees. No surprise overages.
        </p>
        <Link
          to="/pilot"
          className="mt-6 inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
        >
          Start Free Pilot →
        </Link>
      </div>

      <PricingSection />
      <ComplianceBadgesSection />
      <VsCompetitorsSection />

      {/* FAQ */}
      <section
        data-testid="pricing-faq"
        className="bg-white dark:bg-slate-800 py-20"
        aria-label="Frequently asked questions"
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
              >
                <button
                  className="w-full text-left px-5 py-4 font-semibold text-slate-800 dark:text-white text-sm flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {item.q}
                  <span className="text-indigo-600 font-bold ml-4" aria-hidden="true">
                    {openFaq === i ? '−' : '+'}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-slate-500 dark:text-slate-300">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
    </PublicLayout>
  );
}
