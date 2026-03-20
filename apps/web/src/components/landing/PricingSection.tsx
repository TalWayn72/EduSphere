import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const PLAN_DEFS = [
  {
    key: 'starter',
    featureKeys: ['allCoreFeatures', 'knowledgeGraphAI', 'visualAnchoring', 'aiCourseBuilder', 'scormLti', 'samlSso', 'whiteLabelIncl', 'emailSupport'],
    href: '#pilot-cta',
    popular: false,
    dark: false,
  },
  {
    key: 'growth',
    featureKeys: ['everythingInStarter', 'advancedAnalytics', 'customAiModels', 'apiAccess', 'xapiTinCan', 'dedicatedCsm', 'sla999', 'prioritySupport'],
    href: '#pilot-cta',
    popular: false,
    dark: false,
  },
  {
    key: 'university',
    featureKeys: ['everythingInGrowth', 'multiCampus', 'ferpaGdpr', 'vpatHecvat', 'trainingOnboarding', 'sla9995', 'quarterlyReviews'],
    href: '/pilot',
    popular: true,
    dark: false,
  },
  {
    key: 'enterprise',
    featureKeys: ['everythingInUniversity', 'airGappedDeployment', 'onPremise', 'customIntegrations', 'dedicatedInfra', 'whiteGloveOnboarding', 'customSla'],
    href: '/pilot',
    popular: false,
    dark: true,
  },
];

const FAQ_KEYS = ['whatIsYau', 'exceedLimit', 'upgradeMidYear'];

export function PricingSection() {
  const { t } = useTranslation('common');
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
            {t('landing.pricing.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            {t('landing.pricing.subtitle')}{' '}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="underline decoration-dotted text-indigo-600 text-sm cursor-help" aria-label={t('landing.pricing.whatIsYau')}>
                    {t('landing.pricing.whatIsYau')}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {t('landing.pricing.yauTooltip')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
          <p className="mt-2 text-sm text-slate-500">{t('landing.pricing.annualBilling')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-16">
          {PLAN_DEFS.map((plan) => {
            const planName = t(`landing.pricing.plans.${plan.key}.name`);
            const planPrice = t(`landing.pricing.plans.${plan.key}.price`);
            const isCustomPrice = plan.key === 'enterprise';
            return (
              <div
                key={plan.key}
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
                    {t('landing.pricing.mostPopular')}
                  </div>
                )}
                <div className={`p-6 ${plan.popular ? 'pt-10' : ''} flex-1`}>
                  <h3 className={`font-bold text-lg mb-1 ${plan.dark ? 'text-white' : 'text-slate-900'}`}>
                    {planName}
                  </h3>
                  <p className={`text-xs mb-4 ${plan.dark ? 'text-slate-300' : 'text-slate-500'}`}>{t(`landing.pricing.plans.${plan.key}.desc`)}</p>
                  <div className="mb-1">
                    <span className={`text-3xl font-extrabold ${plan.dark ? 'text-white' : 'text-slate-900'}`}>
                      {planPrice}
                    </span>
                    {!isCustomPrice && <span className={`text-sm ml-1 ${plan.dark ? 'text-slate-300' : 'text-slate-500'}`}>{t('landing.pricing.perYear')}</span>}
                  </div>
                  <div className="mb-5">
                    <Badge variant="outline" className={`text-xs ${plan.dark ? 'border-slate-500 text-slate-200' : 'border-indigo-200 text-indigo-700'}`}>
                      {t(`landing.pricing.plans.${plan.key}.yau`)}
                    </Badge>
                    <Badge variant="outline" className={`ml-2 text-xs ${plan.dark ? 'border-green-600 text-green-300' : 'border-green-200 text-green-700'}`}>
                      {t('landing.pricing.whiteLabelIncluded')}
                    </Badge>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {plan.featureKeys.map((fk) => (
                      <li key={fk} className="flex items-start gap-2 text-sm">
                        <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${plan.dark ? 'text-indigo-400' : 'text-indigo-600'}`} aria-hidden="true" />
                        <span className={plan.dark ? 'text-slate-300' : 'text-slate-600'}>{t(`landing.pricing.planFeatures.${fk}`)}</span>
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
                    {plan.href.startsWith('/') ? (
                      <Link to={plan.href}>{t(`landing.pricing.plans.${plan.key}.cta`)}</Link>
                    ) : (
                      <a href={plan.href}>{t(`landing.pricing.plans.${plan.key}.cta`)}</a>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQs */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-lg font-bold text-slate-900 mb-5 text-center">{t('landing.pricing.faqTitle')}</h3>
          <div className="space-y-3">
            {FAQ_KEYS.map((faqKey, i) => (
              <div key={faqKey} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button
                  className="w-full text-left px-5 py-4 font-semibold text-slate-800 text-sm flex justify-between items-center hover:bg-slate-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {t(`landing.pricing.faqs.${faqKey}.q`)}
                  <span className="text-indigo-600 font-bold ml-4" aria-hidden="true">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-slate-500">{t(`landing.pricing.faqs.${faqKey}.a`)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
