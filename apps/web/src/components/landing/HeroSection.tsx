import React from 'react';
import { Link } from 'react-router-dom';
import { Player } from '@remotion/player';
import { Button } from '@/components/ui/button';
import { KnowledgeGraphGrow } from '@/remotion/KnowledgeGraphGrow';
import { useReducedMotion } from '@/providers/ReducedMotionProvider';

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      data-testid="hero-section"
      className="relative overflow-hidden text-white min-h-[600px] flex items-center"
      aria-label="Hero"
    >
      {/* Layer 1 — fallback dark gradient (always visible, sits behind everything) */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900"
        aria-hidden="true"
      />

      {/* Layer 2 — Remotion: knowledge graph growing in the background */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <Player
            component={KnowledgeGraphGrow}
            durationInFrames={360}
            fps={30}
            compositionWidth={1920}
            compositionHeight={1080}
            style={{ width: '100%', height: '100%' }}
            autoPlay
            loop
          />
        </div>
      )}

      {/* Layer 3 — semi-transparent overlay so text stays readable */}
      <div className="absolute inset-0 bg-black/45" aria-hidden="true" />

      {/* Animated gradient orbs */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl animate-pulse [animation-delay:1.5s]"
        aria-hidden="true"
      />

      {/* Layer 4 — content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-28 text-center w-full">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-4 py-1.5 text-sm font-medium text-indigo-200 mb-8">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" aria-hidden="true" />
          AI-Native LMS — Now Replacing Canvas, D2L &amp; Blackboard
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          The AI-Native LMS<br className="hidden sm:block" /> That Replaces Canvas
        </h1>
        <p className="text-lg sm:text-xl text-indigo-100 mb-4 max-w-3xl mx-auto leading-relaxed">
          Knowledge Graph intelligence. Visual Anchoring. Built-in AI Tutor. True white-label included.
        </p>
        <p className="text-sm text-indigo-300 mb-10 font-medium">
          Starting at <span className="text-white font-bold">$12,000/year</span> for up to 500 active users
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xl shadow-indigo-900/40 px-8"
            asChild
          >
            <Link to="/pilot">Request Demo</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/50 text-white hover:bg-white/10 font-semibold px-8"
            asChild
          >
            <Link to="/pilot">Start 90-Day Pilot</Link>
          </Button>
        </div>
        <p className="mt-6 text-xs text-indigo-400">
          No credit card required &middot; Full feature access &middot; Dedicated onboarding specialist
        </p>
      </div>
    </section>
  );
}
