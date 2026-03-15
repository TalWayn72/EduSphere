import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Lightbulb, ShieldCheck, Accessibility, BookOpen } from 'lucide-react';
import { PageMeta } from '@/components/seo';
import { LandingFooter } from '@/components/landing/LandingFooter';

const TEAM = [
  { name: 'Sarah Cohen', role: 'CEO', initials: 'SC' },
  { name: 'David Levy', role: 'CTO', initials: 'DL' },
  { name: 'Maya Rosen', role: 'VP Product', initials: 'MR' },
  { name: 'Amit Shapira', role: 'VP Engineering', initials: 'AS' },
] as const;

const STATS = [
  { label: 'Founded', value: '2024' },
  { label: 'Employees', value: '50+' },
  { label: 'Institutions', value: '200+' },
  { label: 'Learners', value: '100K+' },
] as const;

const VALUES = [
  { icon: Lightbulb, title: 'Innovation', desc: 'Pushing boundaries with AI-driven pedagogy and knowledge graphs.' },
  { icon: Accessibility, title: 'Accessibility', desc: 'WCAG 2.2 AA compliant — learning for everyone, everywhere.' },
  { icon: ShieldCheck, title: 'Privacy-First', desc: 'GDPR, SOC 2, and ISO 27001 by design — your data stays yours.' },
  { icon: BookOpen, title: 'Open Standards', desc: 'SCORM, LTI, Open Badges, and W3C Verifiable Credentials.' },
] as const;

export function AboutPage() {
  return (
    <>
      <PageMeta
        title="About EduSphere — AI-Native Learning Platform"
        description="Learn about EduSphere's mission to democratize education through AI and Knowledge Graphs."
        canonical="/about"
      />

      {/* Nav */}
      <nav aria-label="About page navigation" className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2" aria-label="Back to home">
            <Brain className="h-7 w-7 text-indigo-600" aria-hidden="true" />
            <span className="text-xl font-bold text-gray-900">EduSphere</span>
          </Link>
          <Link to="/" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
            &larr; Home
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section aria-labelledby="about-heading" className="bg-gradient-to-br from-indigo-50 to-white py-20 text-center">
          <div className="max-w-3xl mx-auto px-4">
            <h1 id="about-heading" className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4">About EduSphere</h1>
            <p className="text-lg text-slate-600">Building the future of learning with AI and Knowledge Graphs</p>
          </div>
        </section>

        {/* Mission */}
        <section aria-labelledby="mission-heading" className="max-w-4xl mx-auto px-4 py-16">
          <h2 id="mission-heading" className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
          <p className="text-slate-600 leading-relaxed">
            EduSphere exists to democratize education through AI. We believe every learner deserves a personalised,
            adaptive experience — powered by knowledge graphs that map understanding, AI tutors that never sleep,
            and analytics that help educators focus on what matters most: their students.
          </p>
        </section>

        {/* Stats */}
        <section aria-label="Company statistics" className="bg-indigo-600 py-12">
          <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold text-white">{s.value}</p>
                <p className="text-indigo-200 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section aria-labelledby="team-heading" className="max-w-5xl mx-auto px-4 py-16">
          <h2 id="team-heading" className="text-2xl font-bold text-slate-900 mb-8 text-center">Leadership Team</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {TEAM.map((m) => (
              <article key={m.name} className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-3" aria-hidden="true">
                  <span className="text-indigo-600 font-bold text-lg">{m.initials}</span>
                </div>
                <p className="font-semibold text-slate-900">{m.name}</p>
                <p className="text-sm text-slate-500">{m.role}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Values */}
        <section aria-labelledby="values-heading" className="bg-slate-50 py-16">
          <div className="max-w-5xl mx-auto px-4">
            <h2 id="values-heading" className="text-2xl font-bold text-slate-900 mb-8 text-center">Our Values</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {VALUES.map((v) => (
                <div key={v.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <v.icon className="h-8 w-8 text-indigo-600 mb-3" aria-hidden="true" />
                  <h3 className="font-semibold text-slate-900 mb-1">{v.title}</h3>
                  <p className="text-sm text-slate-600">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </>
  );
}

export default AboutPage;
