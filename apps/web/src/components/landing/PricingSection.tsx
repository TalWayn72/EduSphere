import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const PLANS = [
  {
    name: 'Starter',
    price: '$12,000',
    yau: '500 YAU',
    desc: 'For small departments and pilot programs',
    features: ['All core features', 'Knowledge Graph AI', 'Visual Anchoring', 'AI Course Builder', 'SCORM + LTI 1.3', 'SAML SSO', 'White-label INCLUDED', 'Email support'],
    cta: 'Start Pilot',
    href: '#pilot-cta',
    popular: false,
    dark: false,
  },
  {
    name: 'Growth',
    price: '$32,000',
    yau: '2,000 YAU',
    desc: 'For growing institutions and enterprises',
    features: ['Everything in Starter', 'Advanced analytics', 'Custom AI models', 'API access', 'xAPI / Tin Can', 'Dedicated CSM', 'SLA 99.9%', 'Priority support'],
    cta: 'Start Pilot',
    href: '#pilot-cta',
    popular: false,
    dark: false,
  },
  {
    name: 'University',
    price: '$65,000',
    yau: '10,000 YAU',
    desc: 'For universities and large enterprises',
    features: ['Everything in Growth', 'Multi-campus deployment', 'FERPA + GDPR compliance pack', 'VPAT / HECVAT documentation', 'Training & onboarding', 'Priority SLA 99.95%', 'Quarterly business reviews'],
    cta: 'Request Demo',
    href: '/demo',
    popular: true,
    dark: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    yau: 'Unlimited',
    desc: 'Air-Gapped, on-premise, or hybrid',
    features: ['Everything in University', 'Air-Gapped deployment', 'On-premise option', 'Custom integrations', 'Dedicated infrastructure', 'White-glove onboarding', 'Custom SLA'],
    cta: 'Contact Sales',
    href: '/contact',
    popular: false,
    dark: true,
  },
];

const FAQS = [
  { q: 'What counts as a YAU?', a: 'A Yearly Active User is any user who logs in at least once during your contract year.' },
  { q: 'What happens if I exceed my YAU limit?', a: 'We notify you at 80% and 100% usage. Overages are billed at a prorated rate, never a surprise.' },
  { q: 'Can I upgrade mid-year?', a: 'Yes. You can upgrade at any time and we pro-rate the difference.' },
];

export function PricingSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section
      id="pricing"
      data-testid="pricing-section"
      className="bg-slate-50 py-20"
      aria-label="Pricing plans"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Transparent B2B Pricing — No Per-Module Fees
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            YAU-based pricing: only pay for users who actually learn.{' '}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="underline decoration-dotted text-indigo-600 text-sm cursor-help" aria-label="What is YAU?">
                    What is YAU?
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  YAU = Yearly Active User. A user who logs in at least once during your contract year.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
          <p className="mt-2 text-sm text-slate-400">Annual billing &middot; All plans include White-label INCLUDED</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-16">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border flex flex-col overflow-hidden ${
                plan.popular
                  ? 'border-indigo-500 ring-2 ring-indigo-500 shadow-xl'
                  : plan.dark
                  ? 'border-slate-700 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white shadow-sm'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-indigo-600 text-white text-xs font-bold text-center py-1.5">
                  Most Popular
                </div>
              )}
              <div className={`p-6 ${plan.popular ? 'pt-10' : ''} flex-1`}>
                <h3 className={`font-bold text-lg mb-1 ${plan.dark ? 'text-white' : 'text-slate-900'}`}>
                  {plan.name}
                </h3>
                <p className={`text-xs mb-4 ${plan.dark ? 'text-slate-400' : 'text-slate-500'}`}>{plan.desc}</p>
                <div className="mb-1">
                  <span className={`text-3xl font-extrabold ${plan.dark ? 'text-white' : 'text-slate-900'}`}>
                    {plan.price}
                  </span>
                  {plan.price !== 'Custom' && <span className={`text-sm ml-1 ${plan.dark ? 'text-slate-400' : 'text-slate-500'}`}>/year</span>}
                </div>
                <div className="mb-5">
                  <Badge variant="outline" className={`text-xs ${plan.dark ? 'border-slate-600 text-slate-300' : 'border-indigo-200 text-indigo-700'}`}>
                    {plan.yau}
                  </Badge>
                  <Badge variant="outline" className={`ml-2 text-xs ${plan.dark ? 'border-green-700 text-green-400' : 'border-green-200 text-green-700'}`}>
                    White-label INCLUDED
                  </Badge>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${plan.dark ? 'text-indigo-400' : 'text-indigo-600'}`} aria-hidden="true" />
                      <span className={plan.dark ? 'text-slate-300' : 'text-slate-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Button
                  className={`w-full font-semibold ${
                    plan.popular
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : plan.dark
                      ? 'bg-white text-slate-900 hover:bg-slate-100'
                      : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-900'
                  }`}
                  variant={plan.popular || plan.dark ? 'default' : 'outline'}
                  asChild
                >
                  <a href={plan.href}>{plan.cta}</a>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQs */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-lg font-bold text-slate-900 mb-5 text-center">Pricing FAQs</h3>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button
                  className="w-full text-left px-5 py-4 font-semibold text-slate-800 text-sm flex justify-between items-center hover:bg-slate-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {faq.q}
                  <span className="text-indigo-600 font-bold ml-4" aria-hidden="true">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-slate-500">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
