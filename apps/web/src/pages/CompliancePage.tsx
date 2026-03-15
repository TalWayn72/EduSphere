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
  ArrowLeft,
} from 'lucide-react';

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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-slate-900 text-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/landing"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4">Compliance & Security</h1>
          <p className="text-slate-300 text-lg max-w-2xl">
            EduSphere is built for institutions that take security, privacy, and
            accessibility seriously. Explore our compliance certifications and
            security posture below.
          </p>
        </div>
      </header>

      {/* Navigation pills */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 py-3" aria-label="Compliance sections">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
            >
              {s.title.split(' ')[0]}
            </a>
          ))}
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
                <div className="p-3 bg-indigo-50 rounded-xl flex-shrink-0">
                  <Icon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id={`${section.id}-heading`}
                    className="text-2xl font-bold text-gray-900"
                  >
                    {section.title}
                  </h2>
                  <p className="mt-2 text-gray-600 leading-relaxed">
                    {section.description}
                  </p>
                </div>
              </div>
              <ul className="ml-16 space-y-2">
                {section.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-gray-700"
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

        {/* CTA */}
        <div className="text-center py-12 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to learn more?
          </h2>
          <p className="text-gray-600 mb-6">
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
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Start Free Pilot
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CompliancePage;
