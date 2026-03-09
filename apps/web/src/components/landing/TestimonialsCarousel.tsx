import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/providers/ReducedMotionProvider';

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
}

const CAROUSEL_TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    quote: 'EduSphere transformed how our team learns. The AI tutor remembers context from previous sessions.',
    author: 'Sarah Chen',
    role: 'L&D Director',
    company: 'TechCorp EU',
  },
  {
    id: '2',
    quote: 'The knowledge graph feature is unmatched. Concepts link automatically across courses.',
    author: 'Marcus Weber',
    role: 'Senior Engineer',
    company: 'DataFlow GmbH',
  },
  {
    id: '3',
    quote: 'Our WCAG 2.2 compliance needs were fully met. Accessibility is clearly a first-class concern.',
    author: 'Aisha Okonkwo',
    role: 'Accessibility Lead',
    company: 'IncludeFirst',
  },
];

export function TestimonialsCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (paused || prefersReducedMotion) return;
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % CAROUSEL_TESTIMONIALS.length);
    }, 4000);
    return () => clearInterval(id);
  }, [paused, prefersReducedMotion]);

  const testimonial = CAROUSEL_TESTIMONIALS[current] ?? CAROUSEL_TESTIMONIALS[0];

  return (
    <section
      className="py-20 px-6 bg-muted/20"
      aria-label="Customer testimonials carousel"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-12">What Our Users Say</h2>
        <div className="relative min-h-[180px]">
          <AnimatePresence mode="wait">
            {testimonial && (
              <motion.div
                key={testimonial.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <blockquote className="text-xl italic text-muted-foreground mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <p className="font-semibold">{testimonial.author}</p>
                <p className="text-sm text-muted-foreground">
                  {testimonial.role} · {testimonial.company}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div
          className="flex justify-center gap-2 mt-8"
          role="tablist"
          aria-label="Testimonial navigation"
        >
          {CAROUSEL_TESTIMONIALS.map((t, i) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={i === current}
              aria-label={`Testimonial ${i + 1}`}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === current ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
