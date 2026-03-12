import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PricingSection } from '@/components/landing/PricingSection';
import { ComplianceBadgesSection } from '@/components/landing/ComplianceBadgesSection';
import { VsCompetitorsSection } from '@/components/landing/VsCompetitorsSection';

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
    <div data-testid="pricing-page" className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <Link to="/landing" className="font-bold text-xl text-indigo-600">
          EduSphere
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/landing" className="text-sm text-slate-600 hover:text-slate-900">
            Home
          </Link>
          <Link
            to="/login"
            className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors"
          >
            Log In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-white py-14 text-center px-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          Pricing &amp; Plans
        </h1>
        <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
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
        className="bg-white py-20"
        aria-label="Frequently asked questions"
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden"
              >
                <button
                  className="w-full text-left px-5 py-4 font-semibold text-slate-800 text-sm flex justify-between items-center hover:bg-slate-100 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {item.q}
                  <span className="text-indigo-600 font-bold ml-4" aria-hidden="true">
                    {openFaq === i ? '−' : '+'}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-slate-500">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 text-center text-sm px-4">
        <p className="font-semibold text-white mb-1">EduSphere</p>
        <p>AI-Native LMS for modern institutions</p>
        <div className="mt-4 flex justify-center gap-6 text-xs">
          <Link to="/landing" className="hover:text-white transition-colors">
            Home
          </Link>
          <Link to="/features" className="hover:text-white transition-colors">
            Features
          </Link>
          <Link to="/pilot" className="hover:text-white transition-colors">
            Start Pilot
          </Link>
          <Link to="/faq" className="hover:text-white transition-colors">
            FAQ
          </Link>
          <Link to="/accessibility" className="hover:text-white transition-colors">
            Accessibility
          </Link>
        </div>
        <p className="mt-6 text-xs text-slate-600">
          © {new Date().getFullYear()} EduSphere. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
