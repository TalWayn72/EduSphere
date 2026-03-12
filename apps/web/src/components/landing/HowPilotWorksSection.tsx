import React from 'react';
import { ClipboardList, Clock, Rocket, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    icon: ClipboardList,
    num: '01',
    title: 'Register Your Organization',
    desc: 'Fill out a short form with your institution details and use case. Takes less than 3 minutes.',
  },
  {
    icon: Clock,
    num: '02',
    title: 'Approval in 24 Hours',
    desc: 'Our team reviews your application and sets up a dedicated environment with your branding.',
  },
  {
    icon: Rocket,
    num: '03',
    title: 'Launch with Full Access',
    desc: 'All features unlocked: Knowledge Graph, Visual Anchoring, AI Course Builder, and more.',
  },
];

export function HowPilotWorksSection() {
  return (
    <section
      data-testid="how-pilot-works-section"
      className="bg-indigo-50 py-20"
      aria-label="How the 90-day pilot works"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Start Your 90-Day Pilot — No Credit Card Required
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Full feature access. Your own white-labeled domain. Up to 500 users.
          </p>
        </div>
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {STEPS.map(({ icon: Icon, num, title, desc }, i) => (
            <React.Fragment key={num}>
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-5 shadow-lg">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Step {num}</div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{desc}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="hidden lg:flex items-center self-center text-indigo-300" aria-hidden="true">
                  <ChevronRight className="h-8 w-8" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="text-center mt-12">
          <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-10" asChild>
            <a href="#pilot-cta">Start Your Pilot</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
