import { PageMeta, SoftwareApplicationSchema, OrganizationSchema, WebSiteSchema } from '@/components/seo';
import { PublicLayout } from '@/components/PublicLayout';
import { HeroSection } from '@/components/landing/HeroSection';
import { TrustBar } from '@/components/landing/TrustBar';
import { ComplianceBadgesSection } from '@/components/landing/ComplianceBadgesSection';
import { VsCompetitorsSection } from '@/components/landing/VsCompetitorsSection';
import { UniqueFeaturesSection } from '@/components/landing/UniqueFeaturesSection';
import { HowPilotWorksSection } from '@/components/landing/HowPilotWorksSection';
import { VideoSection } from '@/components/landing/VideoSection';
import { AICourseBuildSection } from '@/components/landing/AICourseBuildSection';
import { ROICalculatorSection } from '@/components/landing/ROICalculatorSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { PilotCTASection } from '@/components/landing/PilotCTASection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';

// ── LandingPage (root export) ─────────────────────────────────────────────────
export function LandingPage() {
  return (
    <PublicLayout>
      <h1 className="sr-only">EduSphere — AI-Powered Learning Platform</h1>
      <PageMeta
        title="AI-Powered Knowledge Graph Learning Platform"
        description="EduSphere: personalized AI tutoring (Chavruta), knowledge graphs, gamification, and enterprise LMS. Free for individuals, scalable to 100,000+ users."
        canonical="https://app.edusphere.dev/landing"
      />
      <SoftwareApplicationSchema />
      <OrganizationSchema />
      <WebSiteSchema />
      <HeroSection />
      <TrustBar />
      <ComplianceBadgesSection />
      <VsCompetitorsSection />
      <UniqueFeaturesSection />
      <VideoSection />
      <HowPilotWorksSection />
      <AICourseBuildSection />
      <ROICalculatorSection />
      <PricingSection />
      <PilotCTASection />
      <TestimonialsSection />
    </PublicLayout>
  );
}

export default LandingPage;
