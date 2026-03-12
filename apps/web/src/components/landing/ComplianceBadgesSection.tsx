import React from 'react';
import { Shield, Globe, FileCheck, Link2, BookOpen, KeyRound, Lock, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BADGES = [
  { icon: Shield, title: 'FERPA', desc: 'Full student education records privacy compliance' },
  { icon: Globe, title: 'WCAG 2.2 AA', desc: 'Web Content Accessibility Guidelines — fully audited' },
  { icon: FileCheck, title: 'SCORM 2004', desc: 'Standard LMS content import and tracking support' },
  { icon: Link2, title: 'LTI 1.3', desc: 'Deep integration with Canvas, Moodle, and any LTI host' },
  { icon: BookOpen, title: 'xAPI / Tin Can', desc: 'Extended learning activity tracking across systems' },
  { icon: KeyRound, title: 'SAML 2.0 SSO', desc: 'Enterprise single sign-on with any identity provider' },
  { icon: Lock, title: 'GDPR', desc: 'EU data protection: consent, erasure, and portability' },
  { icon: Server, title: 'Air-Gapped Ready', desc: 'Full on-premise deployment with no external calls' },
];

export function ComplianceBadgesSection() {
  return (
    <section
      data-testid="compliance-badges-section"
      className="bg-white py-20"
      aria-label="Compliance certifications"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Built for Institutional Compliance —<br className="hidden sm:block" /> Not an Afterthought
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            Every standard your procurement team will ask for, built in from day one.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {BADGES.map(({ icon: Icon, title, desc }) => (
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
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        {/* SOC2 note */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center gap-3">
            <Shield className="h-5 w-5 text-slate-400" aria-hidden="true" />
            <span className="text-sm text-slate-500">
              <strong className="text-slate-700">SOC 2 Type II</strong> — In progress (Roadmap Q3 2026)
            </span>
          </div>
        </div>
        <div className="text-center">
          <Button variant="outline" asChild>
            <a href="/compliance" aria-label="Download VPAT and HECVAT compliance documents">
              Download VPAT / HECVAT
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
