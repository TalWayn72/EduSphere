import React from 'react';
import { Brain, Network, Trophy, Shield, Globe, Zap, Check } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import {
  PageMeta,
  BreadcrumbSchema,
  OrganizationSchema,
  SoftwareApplicationSchema,
} from '@/components/seo';
import { safeJsonLd } from '@/lib/safe-json-ld';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface HowToStep {
  step: number;
  title: string;
  desc: string;
}

interface Feature {
  id: string;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  title: string;
  tagline: string;
  description: string;
  benefits: string[];
  howItWorks: HowToStep[];
}

const FEATURES: Feature[] = [
  {
    id: 'ai-tutor',
    Icon: Brain,
    title: 'AI Tutoring (Chavruta)',
    tagline: 'The AI that thinks with you',
    description:
      "EduSphere's AI tutor uses Socratic dialogue to challenge your reasoning and build deep understanding. Powered by LangGraph.js with a 4-stage learning loop: assess → quiz → explain → debate.",
    benefits: [
      'Adapts to your learning pace and knowledge gaps',
      'Socratic questioning that builds critical thinking',
      'Concepts auto-linked to your personal knowledge graph',
      'Context preserved across topic switches',
      'Available 24/7 with no message limits on Pro',
    ],
    howItWorks: [
      { step: 1, title: 'Assessment', desc: 'AI assesses your current knowledge level' },
      { step: 2, title: 'Quiz', desc: 'Targeted questions identify specific gaps' },
      { step: 3, title: 'Explain', desc: 'AI explains in a way adapted to your level' },
      { step: 4, title: 'Debate', desc: 'Socratic dialogue deepens understanding' },
    ],
  },
  {
    id: 'knowledge-graph',
    Icon: Network,
    title: 'Knowledge Graph',
    tagline: 'Your personal concept map',
    description:
      "Powered by Apache AGE (graph database) and pgvector semantic search, EduSphere builds a visual map of everything you've learned and how concepts interconnect.",
    benefits: [
      'Visualize relationships between concepts',
      'AI suggests related topics based on your graph',
      'Identify knowledge gaps at a glance',
      'Semantic search across all your learning',
      'Export your knowledge graph as a learning portfolio',
    ],
    howItWorks: [
      { step: 1, title: 'Learn', desc: 'Complete lessons and interact with AI tutor' },
      { step: 2, title: 'Map', desc: 'Concepts are automatically added to your graph' },
      { step: 3, title: 'Connect', desc: 'AI links related concepts as you learn' },
      { step: 4, title: 'Explore', desc: 'Navigate your personal knowledge network' },
    ],
  },
  {
    id: 'gamification',
    Icon: Trophy,
    title: 'Gamification',
    tagline: 'Learning that keeps you coming back',
    description:
      "EduSphere's 5-level mastery system, daily streaks, and OpenBadges 3.0-certified digital badges increase completion rates by 40-60% compared to traditional LMS platforms.",
    benefits: [
      '5-level mastery progression (Novice → Expert)',
      'Daily streaks and XP points',
      'OpenBadges 3.0-certified verifiable badges',
      'Leaderboards for teams and cohorts',
      'Push notifications for achievements and reminders',
    ],
    howItWorks: [
      { step: 1, title: 'Learn', desc: 'Complete lessons to earn XP points' },
      { step: 2, title: 'Level Up', desc: 'Progress through 5 mastery levels' },
      { step: 3, title: 'Earn Badges', desc: 'Receive verifiable OpenBadges on milestones' },
      { step: 4, title: 'Share', desc: 'Display badges on LinkedIn and portfolios' },
    ],
  },
  {
    id: 'enterprise',
    Icon: Shield,
    title: 'Enterprise Grade',
    tagline: 'Built for scale and compliance',
    description:
      'Multi-tenant architecture, SSO/SAML/SCIM, GDPR compliance, WCAG 2.2 AA accessibility, SCORM 1.2/2004, xAPI, LTI 1.3, and custom white-labeling for your organization.',
    benefits: [
      'Multi-tenant with row-level security (RLS)',
      'SSO via SAML 2.0, OIDC, LDAP',
      'SCIM 2.0 user provisioning',
      'GDPR + FERPA compliant',
      'WCAG 2.2 AA accessibility certified',
      'SLA: 99.9% uptime guarantee',
    ],
    howItWorks: [
      { step: 1, title: 'Provision', desc: 'SSO and SCIM auto-create user accounts' },
      { step: 2, title: 'Customize', desc: 'White-label with your branding and domain' },
      { step: 3, title: 'Manage', desc: 'Admin dashboard for all users and courses' },
      { step: 4, title: 'Report', desc: 'Compliance and CPD reporting built-in' },
    ],
  },
  {
    id: 'multilingual',
    Icon: Globe,
    title: 'Multi-Language',
    tagline: '50+ languages with full RTL support',
    description:
      'EduSphere supports 50+ languages with native RTL support for Hebrew and Arabic. Automatic locale detection, localized content delivery, and per-tenant language configuration.',
    benefits: [
      '50+ languages supported',
      'Full RTL support for Hebrew and Arabic',
      'Automatic locale detection',
      'Per-tenant language configuration',
      'Localized email notifications',
    ],
    howItWorks: [],
  },
  {
    id: 'live-sessions',
    Icon: Zap,
    title: 'Live Sessions',
    tagline: 'Real-time collaborative learning',
    description:
      'Schedule and run live instructor-led sessions. Real-time attendance tracking, session recording, and NATS-powered event streaming for instant notifications.',
    benefits: [
      'Real-time session scheduling and notifications',
      'Attendance tracking and reporting',
      'Session recording for later review',
      'Works on web and mobile',
      'Integrated with course completion tracking',
    ],
    howItWorks: [],
  },
];

export function FeaturesPage() {
  const howToSchemas = FEATURES.filter((f) => f.howItWorks.length > 0).map((feature) => ({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How ${feature.title} Works in EduSphere`,
    description: feature.description,
    step: feature.howItWorks.map((s) => ({
      '@type': 'HowToStep',
      position: s.step,
      name: s.title,
      text: s.desc,
    })),
  }));

  return (
    <>
      <PageMeta
        title="Features — AI Tutoring, Knowledge Graph, Gamification & More"
        description="Explore EduSphere's features: AI tutoring (Chavruta), knowledge graph, gamification, enterprise LMS, multi-language support, and live sessions. Built for 100,000+ concurrent users."
        canonical="https://app.edusphere.dev/features"
      />
      <Helmet>
        {howToSchemas.map((schema, i) => (
          <script key={i} type="application/ld+json">
            {safeJsonLd(schema)}
          </script>
        ))}
      </Helmet>
      <BreadcrumbSchema
        items={[
          { name: 'EduSphere', url: 'https://app.edusphere.dev/landing' },
          { name: 'Features', url: 'https://app.edusphere.dev/features' },
        ]}
      />
      <OrganizationSchema />
      <SoftwareApplicationSchema />

      <div className="min-h-screen bg-gray-50 dark:bg-background">
        {/* Header */}
        <div className="bg-white dark:bg-card border-b border-gray-100 dark:border-border py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-foreground mb-4">
              Everything You Need to Learn Smarter
            </h1>
            <p className="text-lg text-gray-500 dark:text-muted-foreground max-w-2xl mx-auto mb-8">
              EduSphere combines AI tutoring, knowledge graphs, gamification, and enterprise LMS
              features into a single platform built for 100,000+ concurrent users.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/login">Get Started Free</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/faq">View FAQ</Link>
              </Button>
            </div>
          </div>
        </div>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
          {FEATURES.map((feature, i) => (
            <section
              key={feature.id}
              id={feature.id}
              aria-labelledby={`feature-title-${feature.id}`}
              className="scroll-mt-8"
            >
              <div
                className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}
              >
                {/* Text */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950">
                      <feature.Icon
                        className="h-6 w-6 text-indigo-600"
                        aria-hidden={true}
                      />
                    </div>
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      {feature.tagline}
                    </span>
                  </div>
                  <h2
                    id={`feature-title-${feature.id}`}
                    className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-foreground mb-4"
                  >
                    {feature.title}
                  </h2>
                  <p className="text-gray-600 dark:text-muted-foreground leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.benefits.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-sm text-gray-700 dark:text-foreground"
                      >
                        <Check
                          className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0"
                          aria-hidden={true}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* How it Works */}
                {feature.howItWorks.length > 0 && (
                  <div className="flex-1 bg-white dark:bg-card rounded-2xl border border-gray-200 dark:border-border p-6">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-muted-foreground uppercase tracking-wide mb-4">
                      How it works
                    </h3>
                    <ol className="space-y-4">
                      {feature.howItWorks.map((s) => (
                        <li key={s.step} className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {s.step}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-foreground text-sm">
                              {s.title}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-muted-foreground">
                              {s.desc}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </section>
          ))}
        </main>

        {/* CTA */}
        <div className="bg-indigo-700 py-16 text-center text-white">
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-3xl font-extrabold mb-4">Ready to Transform Learning?</h2>
            <p className="text-indigo-200 mb-8">
              Start free. Upgrade anytime. No credit card required.
            </p>
            <Button
              size="lg"
              className="bg-white text-indigo-700 hover:bg-indigo-50"
              asChild
            >
              <Link to="/login">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default FeaturesPage;
