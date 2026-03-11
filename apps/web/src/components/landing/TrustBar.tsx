import React from 'react';
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

const PLACEHOLDERS = [
  'University Partner',
  'University Partner',
  'University Partner',
  'University Partner',
  'University Partner',
];

export function TrustBar() {
  return (
    <section
      data-testid="trust-bar"
      className="bg-white border-b border-slate-100 py-8"
      aria-label="Trust indicators"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
          Trusted by universities, enterprises &amp; government agencies
        </p>
        {/* Compliance mini-badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-8" role="list" aria-label="Compliance certifications">
          {BADGES.map((badge) => (
            <div
              key={badge}
              role="listitem"
              className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold text-slate-700"
            >
              <Shield className="h-3 w-3 text-indigo-600" aria-hidden="true" />
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
          {PLACEHOLDERS.map((label, i) => (
            <div
              key={i}
              role="listitem"
              className="w-32 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs font-medium"
              aria-label={label}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
