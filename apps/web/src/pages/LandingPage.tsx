import React, { useState } from 'react';
import { PageMeta, SoftwareApplicationSchema, OrganizationSchema, WebSiteSchema } from '@/components/seo';
import { Link } from 'react-router-dom';
import { Brain, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroSection } from '@/components/landing/HeroSection';
import { TrustBar } from '@/components/landing/TrustBar';
import { ComplianceBadgesSection } from '@/components/landing/ComplianceBadgesSection';
import { VsCompetitorsSection } from '@/components/landing/VsCompetitorsSection';
import { UniqueFeaturesSection } from '@/components/landing/UniqueFeaturesSection';
import { HowPilotWorksSection } from '@/components/landing/HowPilotWorksSection';
import { AICourseBuildSection } from '@/components/landing/AICourseBuildSection';
import { ROICalculatorSection } from '@/components/landing/ROICalculatorSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { PilotCTASection } from '@/components/landing/PilotCTASection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

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
          <a href="/compliance" className="hover:text-indigo-600 transition-colors">Compliance</a>
          <a href="#pilot-cta" className="hover:text-indigo-600 transition-colors">Pilot</a>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Log In</Link>
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white" asChild>
            <a href="#pilot-cta">Start Free Pilot</a>
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
          <a href="/compliance" onClick={() => setMenuOpen(false)} className="text-gray-700 dark:text-foreground hover:text-indigo-600">Compliance</a>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link to="/login">Log In</Link>
            </Button>
            <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white" asChild>
              <a href="#pilot-cta">Free Pilot</a>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── LandingPage (root export) ─────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="min-h-screen font-sans">
      <PageMeta
        title="AI-Powered Knowledge Graph Learning Platform"
        description="EduSphere: personalized AI tutoring (Chavruta), knowledge graphs, gamification, and enterprise LMS. Free for individuals, scalable to 100,000+ users."
        canonical="https://app.edusphere.dev/landing"
      />
      <SoftwareApplicationSchema />
      <OrganizationSchema />
      <WebSiteSchema />
      <LandingNav />
      <main id="main-content">
        <HeroSection />
        <TrustBar />
        <ComplianceBadgesSection />
        <VsCompetitorsSection />
        <UniqueFeaturesSection />
        <HowPilotWorksSection />
        <AICourseBuildSection />
        <ROICalculatorSection />
        <PricingSection />
        <PilotCTASection />
        <TestimonialsSection />
      </main>
      <LandingFooter />
    </div>
  );
}

export default LandingPage;
