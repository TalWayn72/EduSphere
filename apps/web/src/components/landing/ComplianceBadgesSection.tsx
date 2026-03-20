import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Globe, FileCheck, Link2, BookOpen, KeyRound, Lock, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BADGE_ITEMS = [
  { icon: Shield, title: 'FERPA', descKey: 'ferpa' },
  { icon: Globe, title: 'WCAG 2.2 AA', descKey: 'wcag' },
  { icon: FileCheck, title: 'SCORM 2004', descKey: 'scorm' },
  { icon: Link2, title: 'LTI 1.3', descKey: 'lti' },
  { icon: BookOpen, title: 'xAPI / Tin Can', descKey: 'xapi' },
  { icon: KeyRound, title: 'SAML 2.0 SSO', descKey: 'saml' },
  { icon: Lock, title: 'GDPR', descKey: 'gdpr' },
  { icon: Server, title: 'Air-Gapped Ready', descKey: 'airGapped' },
];

export function ComplianceBadgesSection() {
  const { t } = useTranslation('common');

  return (
    <section
      id="compliance"
      data-testid="compliance-badges-section"
      className="bg-white py-20"
      aria-label="Compliance certifications"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            {t('landing.complianceBadges.title')}<br className="hidden sm:block" /> {t('landing.complianceBadges.titleBreak')}
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            {t('landing.complianceBadges.subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {BADGE_ITEMS.map(({ icon: Icon, title, descKey }) => (
            <div
              key={title}
              className="border border-indigo-100 rounded-xl p-5 bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-indigo-50 flex-shrink-0">
                  <Icon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">{title}</span>
                  <span className="text-green-600 text-sm font-bold" aria-label="Certified">✓</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{t(`landing.complianceBadges.${descKey}`)}</p>
            </div>
          ))}
        </div>
        {/* SOC2 note */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center gap-3">
            <Shield className="h-5 w-5 text-slate-500" aria-hidden="true" />
            <span className="text-sm text-slate-500">
              <strong className="text-slate-700">{t('landing.complianceBadges.soc2')}</strong> — {t('landing.complianceBadges.soc2Status')}
            </span>
          </div>
        </div>
        <div className="text-center">
          <Button variant="outline" asChild>
            <Link to="/compliance#downloads" aria-label="Download VPAT and HECVAT compliance documents">
              {t('landing.complianceBadges.downloadVpat')}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
