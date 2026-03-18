/**
 * CompliancePage — Static public compliance overview.
 * Route: /compliance (public, no auth required)
 *
 * Contains section anchors for footer links:
 * #ferpa, #wcag, #scorm, #gdpr, #air-gapped, #security
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Eye,
  FileCheck,
  Globe,
  Wifi,
  Lock,
  Download,
} from 'lucide-react';
import { PublicLayout } from '@/components/PublicLayout';
import { PageHeader } from '@/components/PageHeader';

const SECTIONS = [
  {
    id: 'ferpa',
    icon: ShieldCheck,
    title: 'FERPA Compliance',
    description:
      'EduSphere is designed to comply with the Family Educational Rights and Privacy Act (FERPA). All student education records are protected through role-based access controls, encrypted storage, and tenant-level data isolation.',
    items: [
      'Student records accessible only to authorized institution personnel',
      'Parent/guardian access controls for eligible students',
      'Audit logging of all record access events',
      'Data deletion upon institutional request',
    ],
  },
  {
    id: 'wcag',
    icon: Eye,
    title: 'WCAG 2.2 AA Accessibility',
    description:
      'Our platform meets WCAG 2.2 Level AA standards, ensuring all learners — including those with disabilities — can fully participate in educational experiences.',
    items: [
      'Keyboard-navigable interface throughout',
      'Screen reader compatible with ARIA labels',
      'Color contrast ratios meeting AA thresholds',
      'Reduced motion support for animations',
      'Alt text for all images and media',
    ],
  },
  {
    id: 'scorm',
    icon: FileCheck,
    title: 'SCORM & xAPI Standards',
    description:
      'EduSphere supports SCORM 1.2/2004 and xAPI (Experience API) for seamless content interoperability and learning analytics across LMS platforms.',
    items: [
      'SCORM 1.2 and SCORM 2004 package import/export',
      'xAPI statement generation for all learning activities',
      'LRS (Learning Record Store) integration',
      'LTI 1.3 tool integration for third-party content',
    ],
  },
  {
    id: 'gdpr',
    icon: Globe,
    title: 'GDPR Data Protection',
    description:
      'Full compliance with the EU General Data Protection Regulation, including consent management, data portability, and the right to erasure.',
    items: [
      'Explicit consent collection before data processing',
      'Data portability export (JSON/CSV)',
      'Right to erasure — full data deletion on request',
      'Data Processing Agreement (DPA) available',
      'EU data residency options',
    ],
  },
  {
    id: 'air-gapped',
    icon: Wifi,
    title: 'Air-Gapped Deployment',
    description:
      'EduSphere can be deployed in fully air-gapped environments for government, defense, and high-security installations with no internet dependency.',
    items: [
      'Fully offline operation with local AI models (Ollama)',
      'On-premises Docker/Kubernetes deployment',
      'No external API calls required in air-gapped mode',
      'Local knowledge graph and vector search',
      'Offline-first PWA for end users',
    ],
  },
  {
    id: 'security',
    icon: Lock,
    title: 'Enterprise Security',
    description:
      'Multi-layered security architecture including encryption at rest and in transit, mTLS between services, and comprehensive audit trails.',
    items: [
      'AES-256-GCM encryption for PII fields',
      'TLS 1.3 for all data in transit',
      'Row-Level Security (RLS) for multi-tenant isolation',
      'JWT-based authentication via Keycloak (OIDC)',
      'Rate limiting and query complexity controls',
      'SOC 2 Type II audit-ready controls',
    ],
  },
];

export function CompliancePage() {
  return (
    <PublicLayout>
      <div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <PageHeader title="Compliance & Certifications" description="Industry standards, security certifications, and regulatory compliance." />
        </div>
        {/* Navigation pills */}
      <nav className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 py-3" aria-label="Compliance sections">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }); }}
              className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
            >
              {s.title.split(' ')[0]}
            </a>
          ))}
          <a
            href="#downloads"
            onClick={(e) => { e.preventDefault(); document.getElementById('downloads')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 hover:text-indigo-800 transition-colors"
          >
            Downloads
          </a>
        </div>
      </nav>

      {/* Sections */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-20"
              aria-labelledby={`${section.id}-heading`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex-shrink-0">
                  <Icon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id={`${section.id}-heading`}
                    className="text-2xl font-bold text-gray-900 dark:text-white"
                  >
                    {section.title}
                  </h2>
                  <p className="mt-2 text-gray-600 dark:text-slate-300 leading-relaxed">
                    {section.description}
                  </p>
                </div>
              </div>
              <ul className="ml-16 space-y-2">
                {section.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-gray-700 dark:text-white"
                  >
                    <ShieldCheck
                      className="h-4 w-4 text-green-500 mt-1 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {/* Download Documents */}
        <section
          id="downloads"
          className="scroll-mt-20 py-12 border-t border-gray-200 dark:border-slate-700"
          aria-labelledby="downloads-heading"
        >
          <h2
            id="downloads-heading"
            className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
          >
            Download Compliance Documents
          </h2>
          <p className="text-gray-600 dark:text-slate-300 mb-6">
            Share these with your procurement or IT security team.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/compliance/EduSphere-VPAT-2.5.html"
              download="EduSphere-VPAT-2.5.html"
              className="flex items-center gap-4 p-5 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors group"
            >
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                <Download className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white block">
                  VPAT 2.5 (Section 508)
                </span>
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  Voluntary Product Accessibility Template — WCAG 2.2 AA
                </span>
              </div>
            </a>
            <a
              href="/compliance/EduSphere-HECVAT-Lite-2026.html"
              download="EduSphere-HECVAT-Lite-2026.html"
              className="flex items-center gap-4 p-5 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors group"
            >
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                <Download className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white block">
                  HECVAT Lite
                </span>
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  Higher Education Vendor Assessment — Security &amp; Data
                </span>
              </div>
            </a>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center py-12 border-t border-gray-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to learn more?
          </h2>
          <p className="text-gray-600 dark:text-slate-300 mb-6">
            Contact our team for a detailed security review or to request our SOC
            2 report.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/contact"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors font-medium"
            >
              Contact Sales
            </Link>
            <Link
              to="/pilot"
              className="px-6 py-3 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              Start Free Pilot
            </Link>
          </div>
        </div>
      </main>
      </div>
    </PublicLayout>
  );
}

export default CompliancePage;
