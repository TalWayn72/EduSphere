import React, { useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
  { num: 1, text: 'Enter a topic or upload a syllabus' },
  { num: 2, text: 'AI generates course outline in seconds' },
  { num: 3, text: 'Modules and lessons auto-populated' },
  { num: 4, text: 'Quizzes auto-generated from content' },
  { num: 5, text: 'Review, customize, and publish' },
];

// 5 instructors × 8 hrs/week × 52 weeks × 60% reduction
const ANNUAL_HOURS_SAVED = 5 * 8 * 52 * 0.6;

function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = null;
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.round(progress * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return count;
}

export function AICourseBuildSection() {
  const count = useCountUp(ANNUAL_HOURS_SAVED);

  return (
    <section
      data-testid="ai-course-build-section"
      className="bg-slate-900 py-20 text-white"
      aria-label="AI Course Builder"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-4 py-1.5 text-sm font-medium text-indigo-200 mb-6">
            <Zap className="h-4 w-4" aria-hidden="true" />
            AI Course Builder
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Build a Complete Course in 10 Minutes
          </h2>
          <p className="mt-4 text-slate-300 text-lg max-w-2xl mx-auto">
            AI generates modules, lessons, quizzes, and assessments — you review and publish.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Steps */}
          <ol className="space-y-4" aria-label="AI Course Builder steps">
            {STEPS.map((step) => (
              <li
                key={step.num}
                className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4"
              >
                <span
                  className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0"
                  aria-hidden="true"
                >
                  {step.num}
                </span>
                <span className="text-slate-200 text-sm font-medium">{step.text}</span>
              </li>
            ))}
          </ol>

          {/* Counter */}
          <div className="text-center lg:text-left">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <p className="text-sm text-slate-400 font-medium mb-2 uppercase tracking-wider">
                Estimated instructor hours saved
              </p>
              <div
                className="text-6xl font-extrabold text-indigo-400 mb-1"
                aria-live="polite"
                aria-label={`${count} hours per year`}
              >
                {count.toLocaleString()}
              </div>
              <p className="text-slate-400 text-sm">hours/year</p>
              <p className="mt-4 text-xs text-slate-500">
                Based on 5 instructors × 8 hrs/week × 60% reduction in course creation time
              </p>
            </div>
            <div className="mt-6">
              <Button
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold w-full lg:w-auto"
                asChild
              >
                <a href="/demo#course-builder">See AI Course Builder Demo</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
