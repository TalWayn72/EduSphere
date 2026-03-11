import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Network,
  Trophy,
  Shield,
  Globe,
  Zap,
  Menu,
  X,
  Github,
  Twitter,
  Linkedin,
  Check,
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Player } from '@remotion/player';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MotionCard } from '@/components/landing/MotionCard';
import { AnimatedCounter } from '@/components/landing/AnimatedCounter';
import { TestimonialsCarousel } from '@/components/landing/TestimonialsCarousel';
import { VideoSection } from '@/components/landing/VideoSection';
import { AIChavrutaTyping } from '@/remotion/AIChavrutaTyping';
import { KnowledgeGraphGrow } from '@/remotion/KnowledgeGraphGrow';
import { OnboardingSpeed } from '@/remotion/OnboardingSpeed';
import { useReducedMotion } from '@/providers/ReducedMotionProvider';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// ── LandingNav ────────────────────────────────────────────────────────────────
function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav
      data-testid="landing-nav"
      className="sticky top-0 z-50 bg-white/95 dark:bg-card/95 backdrop-blur border-b border-gray-100 dark:border-border shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <Brain className="h-7 w-7 text-indigo-600" aria-hidden="true" />
          <span className="text-xl font-bold text-gray-900 dark:text-foreground">EduSphere</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-muted-foreground">
          <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Blog</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Docs</a>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Log In</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/login">Get Started</Link>
          </Button>
        </div>
        <button
          className="md:hidden p-2 rounded-md text-gray-600 dark:text-muted-foreground hover:text-indigo-600"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-white dark:bg-card border-t border-gray-100 dark:border-border px-4 py-4 flex flex-col gap-4 text-sm font-medium">
          <a href="#features" onClick={() => setMenuOpen(false)} className="text-gray-700 dark:text-foreground hover:text-indigo-600">Features</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} className="text-gray-700 dark:text-foreground hover:text-indigo-600">Pricing</a>
          <a href="#" className="text-gray-700 dark:text-foreground hover:text-indigo-600">Blog</a>
          <a href="#" className="text-gray-700 dark:text-foreground hover:text-indigo-600">Docs</a>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link to="/login">Log In</Link>
            </Button>
            <Button size="sm" asChild className="flex-1">
              <Link to="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── HeroSection ───────────────────────────────────────────────────────────────
function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReducedMotion || !heroRef.current) return;
      gsap.fromTo(
        heroRef.current.querySelectorAll('.hero-animate'),
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
        },
      );
    },
    { scope: heroRef, dependencies: [prefersReducedMotion] },
  );

  return (
    <section
      data-testid="hero-section"
      className="relative overflow-hidden text-white"
    >
      {/* Layer 1 — fallback dark gradient (always visible, sits behind everything) */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950"
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

      {/* Layer 4 — content (relative + z-10 to float above all layers) */}
      <div ref={heroRef} className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-28 text-center">
        <h1 className="hero-animate text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          The AI-Powered Learning Platform<br className="hidden sm:block" /> Built for the Future
        </h1>
        <p className="hero-animate text-lg sm:text-xl text-indigo-100 mb-10 max-w-2xl mx-auto leading-relaxed">
          Personalized learning paths, knowledge graphs, and intelligent tutoring — all in one platform.
        </p>
        <div className="hero-animate flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shadow-lg" asChild>
            <Link to="/login">Get Started Free</Link>
          </Button>
          <Button size="lg" variant="outline" className="border-white/60 text-white hover:bg-white/10 font-semibold">
            Watch Demo
          </Button>
        </div>
      </div>
    </section>
  );
}

// ── StatsBar ──────────────────────────────────────────────────────────────────
const STATS = [
  { target: 10000, suffix: '+', label: 'Courses' },
  { target: 500000, suffix: '+', label: 'Learners' },
  { target: 98, suffix: '%', label: 'Completion Rate' },
  { target: 50, suffix: '+', label: 'Languages' },
];

function StatsBar() {
  return (
    <section data-testid="stats-bar" className="bg-white dark:bg-card border-b border-gray-100 dark:border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
        {STATS.map((s) => (
          <div key={s.label}>
            <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600">
              <AnimatedCounter target={s.target} suffix={s.suffix} />
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-muted-foreground font-medium">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── FeaturesSection ───────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: Brain, title: 'AI Tutoring', desc: 'Personalized AI that adapts to your learning style' },
  { Icon: Network, title: 'Knowledge Graph', desc: 'Explore interconnected knowledge like never before' },
  { Icon: Trophy, title: 'Gamification', desc: 'Streaks, badges, and mastery levels keep you motivated' },
  { Icon: Shield, title: 'Enterprise Grade', desc: 'Multi-tenant, WCAG 2.2 AAA compliant, enterprise-grade' },
  { Icon: Globe, title: 'Multi-language', desc: '50+ languages with full RTL support' },
  { Icon: Zap, title: 'Live Sessions', desc: 'Real-time collaborative learning and debate sessions' },
];

function FeaturesSection() {
  return (
    <section id="features" data-testid="features-section" className="bg-gray-50 dark:bg-background py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-foreground">Why EduSphere?</h2>
          <p className="mt-3 text-lg text-gray-500 dark:text-muted-foreground max-w-xl mx-auto">
            Everything you need to build, deliver, and scale world-class learning experiences.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ Icon, title, desc }, i) => (
            <MotionCard key={title} delay={i * 0.1}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-indigo-50">
                      <Icon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-foreground">{title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            </MotionCard>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── AIChavrutaSection ─────────────────────────────────────────────────────────
function AIChavrutaSection() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section
      data-testid="ai-chavruta-section"
      className="bg-white dark:bg-card py-20"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Text */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-950 px-4 py-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-5">
              <Brain className="h-4 w-4" aria-hidden="true" />
              AI Learning Partner
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-foreground mb-5">
              Meet Your Chavruta —<br className="hidden sm:block" /> The AI That Thinks With You
            </h2>
            <p className="text-gray-500 dark:text-muted-foreground leading-relaxed mb-6 max-w-lg">
              Our AI tutor doesn't just answer questions — it debates, challenges your reasoning,
              and builds concept connections in your personal knowledge graph as you learn.
            </p>
            <ul className="space-y-3 text-sm text-gray-600 dark:text-muted-foreground">
              {['Socratic dialogue adapted to your level', 'Concepts auto-linked to your knowledge graph', 'Switch topics mid-conversation — AI keeps context'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-indigo-600 flex-shrink-0" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          {/* Remotion demo */}
          <div className="flex-1 w-full max-w-sm lg:max-w-md">
            <MotionCard>
              <div className="rounded-2xl overflow-hidden shadow-2xl bg-[#1e1b4b]" style={{ aspectRatio: '3/2' }}>
                {prefersReducedMotion ? (
                  <div className="w-full h-full flex items-center justify-center p-6 text-center">
                    <p className="text-indigo-300 text-sm">AI Chavruta demo (motion reduced)</p>
                  </div>
                ) : (
                  <Player
                    component={AIChavrutaTyping}
                    durationInFrames={240}
                    fps={30}
                    compositionWidth={600}
                    compositionHeight={400}
                    style={{ width: '100%', height: '100%' }}
                    autoPlay
                    loop
                  />
                )}
              </div>
            </MotionCard>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── HowItWorksSection ─────────────────────────────────────────────────────────
const STEPS = [
  { num: '01', title: 'Sign Up & Set Goals', desc: 'Complete a personalized onboarding assessment. EduSphere maps your goals into a tailored learning path.' },
  { num: '02', title: 'Learn at Your Pace', desc: 'Our AI adapts to your pace, learning style, and knowledge gaps — delivering the right content at the right time.' },
  { num: '03', title: 'Track Mastery', desc: 'Our 5-level mastery system tracks your progress from Novice to Expert, with visual badges every step of the way.' },
];

function HowItWorksSection() {
  return (
    <section data-testid="how-it-works-section" className="bg-white dark:bg-card py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-foreground">How It Works</h2>
          <p className="mt-3 text-lg text-gray-500 dark:text-muted-foreground">Three simple steps to transform your learning.</p>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          {STEPS.map((step, i) => (
            <div key={step.num} className="flex-1 flex flex-col items-center text-center relative">
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(50%+2rem)] right-0 h-px bg-indigo-200" aria-hidden="true" />
              )}
              <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-extrabold mb-4 z-10 relative">
                {step.num}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-foreground text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 dark:text-muted-foreground leading-relaxed max-w-xs">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── TestimonialsSection ───────────────────────────────────────────────────────
const TESTIMONIALS = [
  { quote: 'EduSphere\'s AI tutor helped me go from beginner to certified developer in 4 months. The knowledge graph made complex topics finally click.', name: 'Sarah Chen', role: 'Software Engineer at Stripe' },
  { quote: 'We deployed EduSphere for 3,000 employees across 12 countries. The multi-language support and SSO integration were flawless.', name: 'Marcus Rivera', role: 'Head of L&D, Acme Corp' },
  { quote: 'The gamification system kept my students engaged unlike anything I\'ve tried before. Completion rates jumped from 40% to 94%.', name: 'Dr. Aisha Patel', role: 'Professor, MIT OpenCourseWare' },
];

function TestimonialsSection() {
  return (
    <section data-testid="testimonials-section" className="bg-indigo-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-foreground">Loved by Learners & Organizations</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="bg-white">
              <CardContent className="pt-6">
                <p className="text-gray-600 dark:text-muted-foreground leading-relaxed text-sm mb-5 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {t.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-foreground text-sm">{t.name}</div>
                    <div className="text-xs text-gray-500 dark:text-muted-foreground">{t.role}</div>
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

// ── PricingSection ────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    desc: 'For individual learners',
    features: ['Access to 100 free courses', 'Basic AI tutor (10 msgs/day)', 'Community forums', 'Progress tracking'],
    cta: 'Start Free',
    popular: false,
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mo',
    desc: 'For serious learners',
    features: ['Unlimited courses', 'Unlimited AI tutor', 'Advanced analytics', 'Knowledge graph access', 'Priority support'],
    cta: 'Start Pro Trial',
    popular: true,
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For organizations',
    features: ['Multi-tenant management', 'Custom branding & portal', 'SSO / SAML / SCIM', 'SLA + dedicated support', 'Advanced compliance'],
    cta: 'Contact Sales',
    popular: false,
    highlight: false,
  },
];

function PricingSection() {
  return (
    <section id="pricing" data-testid="pricing-section" className="bg-white dark:bg-background py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-foreground">Simple, Transparent Pricing</h2>
          <p className="mt-3 text-lg text-gray-500 dark:text-muted-foreground">Start free, scale as you grow.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-8 flex flex-col relative ${
                plan.highlight
                  ? 'border-indigo-500 shadow-xl ring-2 ring-indigo-500'
                  : 'border-gray-200 dark:border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-foreground">{plan.name}</h3>
                <p className="text-sm text-gray-500 dark:text-muted-foreground mt-1">{plan.desc}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-foreground">{plan.price}</span>
                  {plan.period && <span className="text-gray-500 dark:text-muted-foreground">{plan.period}</span>}
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-muted-foreground">
                    <Check className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={plan.highlight ? '' : 'border border-gray-300'}
                variant={plan.highlight ? 'default' : 'outline'}
                asChild
              >
                <Link to="/login">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTABanner ─────────────────────────────────────────────────────────────────
function CTABanner() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section data-testid="cta-banner" className="relative overflow-hidden bg-indigo-700 py-20 text-white text-center">
      {/* Remotion onboarding animation as background */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none opacity-20" aria-hidden="true">
          <Player
            component={OnboardingSpeed}
            durationInFrames={300}
            fps={30}
            compositionWidth={1920}
            compositionHeight={400}
            style={{ width: '100%', height: '100%' }}
            autoPlay
            loop
          />
        </div>
      )}
      <div className="cta-shimmer absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Ready to Transform Your Learning?</h2>
        <p className="text-indigo-200 text-lg mb-8">
          Join 500,000+ learners already building expertise on EduSphere.
        </p>
        <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shadow-lg" asChild>
          <Link to="/login">Start Free Today</Link>
        </Button>
      </div>
    </section>
  );
}

// ── LandingFooter ─────────────────────────────────────────────────────────────
function LandingFooter() {
  return (
    <footer data-testid="landing-footer" className="bg-gray-900 text-gray-400 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-6 w-6 text-indigo-400" aria-hidden="true" />
              <span className="text-white font-bold text-lg">EduSphere</span>
            </div>
            <p className="text-sm leading-relaxed">AI-powered learning for everyone, everywhere.</p>
          </div>
          {[
            { heading: 'Product', links: ['Features', 'Pricing', 'Knowledge Graph', 'Mobile App'] },
            { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
            { heading: 'Resources', links: ['Documentation', 'API', 'Community', 'Status'] },
            { heading: 'Legal', links: ['Privacy', 'Terms', 'Cookies', 'Accessibility'] },
          ].map((col) => (
            <div key={col.heading}>
              <h4 className="text-white font-semibold text-sm mb-3">{col.heading}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm hover:text-white transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm">© 2026 EduSphere. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com" aria-label="GitHub" className="hover:text-white transition-colors">
              <Github className="h-5 w-5" />
            </a>
            <a href="https://twitter.com" aria-label="Twitter" className="hover:text-white transition-colors">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="https://linkedin.com" aria-label="LinkedIn" className="hover:text-white transition-colors">
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── LandingPage (root export) ─────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="min-h-screen font-sans">
      <LandingNav />
      <main>
        <HeroSection />
        <StatsBar />
        <FeaturesSection />
        <AIChavrutaSection />
        <VideoSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <PricingSection />
        <TestimonialsCarousel />
        <CTABanner />
      </main>
      <LandingFooter />
    </div>
  );
}

export default LandingPage;
