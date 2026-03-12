import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const TESTIMONIALS = [
  {
    quote:
      'As a department chair, we needed a system that could handle our graduate seminar annotations and visual research. EduSphere\'s Visual Anchoring transformed how our students engage with primary sources.',
    name: 'Dr. Sarah Chen',
    role: 'Dept. of History',
    org: 'Research University',
    initials: 'SC',
  },
  {
    quote:
      'Our L&D team cut course creation time by 65%. The AI Course Builder lets our SMEs focus on content, not formatting.',
    name: 'Michael Torres',
    role: 'VP Learning & Development',
    org: 'Global Corporation',
    initials: 'MT',
  },
  {
    quote:
      'For our sensitive defense training content, the air-gapped deployment was non-negotiable. EduSphere is the only LMS that offered this without a 6-month custom build.',
    name: '[Name redacted]',
    role: 'Training Director',
    org: 'Defense Agency',
    initials: 'TD',
  },
];

export function TestimonialsSection() {
  return (
    <section
      data-testid="testimonials-section"
      className="bg-slate-50 py-20"
      aria-label="Customer testimonials"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Trusted by Institutions That Take Learning Seriously
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
            From research universities to defense agencies.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-7 pb-6">
                {/* Large indigo quote mark */}
                <div className="text-5xl leading-none text-indigo-200 font-serif mb-4 select-none" aria-hidden="true">
                  &ldquo;
                </div>
                <p className="text-slate-600 leading-relaxed text-sm mb-6 italic">
                  {t.quote}
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div
                    className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0"
                    aria-hidden="true"
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}, {t.org}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
