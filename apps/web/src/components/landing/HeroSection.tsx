import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Player } from '@remotion/player';
import { Button } from '@/components/ui/button';
import { KnowledgeGraphGrow } from '@/remotion/KnowledgeGraphGrow';
import { useReducedMotion } from '@/providers/ReducedMotionProvider';

export function HeroSection() {
  const { t } = useTranslation('common');
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      data-testid="hero-section"
      className="relative overflow-hidden text-white min-h-[600px] flex items-center dark:text-white"
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
        className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse dark:bg-indigo-400/20"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl animate-pulse [animation-delay:1.5s] dark:bg-purple-400/15"
        aria-hidden="true"
      />

      {/* Layer 4 — content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-28 text-center w-full">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-4 py-1.5 text-sm font-medium text-indigo-100 mb-8 dark:bg-indigo-400/20 dark:border-indigo-500/30 dark:text-indigo-300">
          <span
            className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse dark:bg-indigo-500"
            aria-hidden="true"
          />
          {t('landing.hero.badge')}
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          {t('landing.hero.title')}
          <br className="hidden sm:block" /> {t('landing.hero.titleBreak')}
        </h1>
        <p className="text-lg sm:text-xl text-indigo-100 mb-4 max-w-3xl mx-auto leading-relaxed dark:text-indigo-300">
          {t('landing.hero.subtitle')}
        </p>
        <p className="text-sm text-indigo-300 mb-10 font-medium dark:text-indigo-400">
          {t('landing.hero.startingAtText', { price: t('landing.hero.price') })}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xl shadow-indigo-900/40 px-8 dark:bg-indigo-500 dark:text-white"
            asChild
          >
            <Link to="/pilot">{t('landing.hero.requestDemo')}</Link>
          </Button>
          <Link
            to="/pilot"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md h-11 px-8 border border-white/50 text-white hover:bg-white/15 font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-white"
          >
            {t('landing.hero.startPilot')}
          </Link>
        </div>
        <p className="mt-6 text-xs text-indigo-300 dark:text-indigo-400">
          {t('landing.hero.noCreditCard')}
        </p>
      </div>
    </section>
  );
}
