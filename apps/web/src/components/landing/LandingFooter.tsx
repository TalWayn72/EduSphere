import React from 'react';
import { Brain } from 'lucide-react';

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'AI Course Builder', href: '/features/ai-course-builder' },
      { label: 'Visual Anchoring', href: '/features/visual-anchoring' },
      { label: 'Knowledge Graph', href: '/features/knowledge-graph' },
    ],
  },
  {
    heading: 'Solutions',
    links: [
      { label: 'Universities', href: '/solutions/universities' },
      { label: 'Enterprises', href: '/solutions/enterprises' },
      { label: 'Government & Defense', href: '/solutions/government' },
      { label: 'Training Companies', href: '/solutions/training' },
    ],
  },
  {
    heading: 'Compliance',
    links: [
      { label: 'FERPA', href: '/compliance#ferpa' },
      { label: 'WCAG 2.2 AA', href: '/compliance#wcag' },
      { label: 'SCORM', href: '/compliance#scorm' },
      { label: 'GDPR', href: '/compliance#gdpr' },
      { label: 'Air-Gapped', href: '/compliance#air-gapped' },
      { label: 'Security', href: '/compliance#security' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Accessibility Statement', href: '/accessibility' },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer data-testid="landing-footer" className="bg-slate-900 text-slate-400 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-2 mb-10">
          <Brain className="h-7 w-7 text-indigo-400" aria-hidden="true" />
          <span className="text-white font-bold text-xl">EduSphere</span>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-white font-semibold text-sm mb-4">{col.heading}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm">
            &copy; 2026 EduSphere. Built for institutions that take learning seriously.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <span aria-hidden="true">&middot;</span>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <span aria-hidden="true">&middot;</span>
            <a href="/accessibility" className="hover:text-white transition-colors">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
