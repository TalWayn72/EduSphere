/**
 * InvestorDeckPage — SUPER_ADMIN only internal investor deck.
 * Route: /internal/investor-deck
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthRole } from '@/hooks/useAuthRole';
import { usePageTitle } from '@/hooks/usePageTitle';

const PLATFORM_LIVE_STATS_QUERY = `
  query PlatformLiveStats {
    platformLiveStats {
      totalTenants
      totalLearners
      totalCoursesCreated
      avgEngagementScore
    }
  }
`;

interface Slide {
  n: number;
  title: string;
  content: React.ReactNode;
}

function SlideCard({ slide }: { slide: Slide }) {
  return (
    <Card data-testid={`slide-${slide.n}`} className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex flex-row items-center gap-4 py-4">
        <span className="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
          {slide.n}
        </span>
        <CardTitle className="text-white text-lg">{slide.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 text-sm text-foreground">
        {slide.content}
      </CardContent>
    </Card>
  );
}

export function InvestorDeckPage() {
  usePageTitle('Investor Deck (Internal)');
  const role = useAuthRole();
  const navigate = useNavigate();

  const [result] = useQuery({ query: PLATFORM_LIVE_STATS_QUERY });
  const stats = result.data?.platformLiveStats;

  if (role !== 'SUPER_ADMIN') {
    return (
      <div data-testid="investor-deck-page" className="min-h-screen flex items-center justify-center bg-background">
        <div data-testid="access-denied" className="text-center space-y-4">
          <p className="text-4xl">🔒</p>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">This page is restricted to SUPER_ADMIN users only.</p>
          <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const slides: Slide[] = [
    {
      n: 1,
      title: 'EduSphere — AI-Native LMS for the Knowledge Economy',
      content: <p>The world's first Knowledge Graph-powered LMS with native GraphRAG, Visual Anchoring, and AI tutors — purpose-built for organizations that treat knowledge as a strategic asset.</p>,
    },
    {
      n: 2,
      title: 'Problem',
      content: <p>Organizations lose <strong>25% of revenue</strong> to undocumented knowledge. Traditional LMS tools capture courses, not expertise. When experts leave, institutional knowledge walks out the door.</p>,
    },
    {
      n: 3,
      title: 'Solution',
      content: <p>GraphRAG + Visual Anchoring + AI Tutor in one platform. EduSphere automatically maps expertise into a living Knowledge Graph that mentors every learner with context-aware AI.</p>,
    },
    {
      n: 4,
      title: 'Why Now',
      content: <p>AI-Driven KM market: <strong>$9.6B → $237B by 2034 (CAGR 43.7%)</strong>. Generative AI has made knowledge graph construction 10x cheaper. The timing has never been better.</p>,
    },
    {
      n: 5,
      title: 'Product — Top 3 Differentiators',
      content: (
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>GraphRAG:</strong> Semantic search fused with Apache AGE knowledge graph traversal</li>
          <li><strong>Visual Anchoring:</strong> Embed knowledge anchors into images, videos, and 3D models</li>
          <li><strong>AI Tutor:</strong> Socratic + Chavruta debate agents powered by LangGraph.js</li>
        </ul>
      ),
    },
    {
      n: 6,
      title: 'Business Model',
      content: (
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>B2B SaaS:</strong> $12K–$65K/yr institutional contracts</li>
          <li><strong>B2B2C Marketplace:</strong> 30% RevShare — partners keep 70%</li>
          <li><strong>Pilot Funnel:</strong> 90-day free pilot → 70% conversion rate</li>
        </ul>
      ),
    },
    {
      n: 7,
      title: 'Go-to-Market',
      content: <p>90-day free pilot → proof of value → institutional contract. No cold sales. Pilots generate organic champions inside organizations who drive board-level procurement decisions.</p>,
    },
    {
      n: 8,
      title: 'Competition',
      content: <p>Only platform with <strong>native Knowledge Graph</strong> + <strong>Air-Gapped deployment</strong> + <strong>Visual Anchoring</strong>. Competitors (Cornerstone, Degreed, 360Learning) lack graph-native architecture.</p>,
    },
    {
      n: 9,
      title: 'Traction',
      content: stats ? (
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>{stats.totalTenants?.toLocaleString() ?? '—'}</strong> organizations onboarded</li>
          <li><strong>{stats.totalLearners?.toLocaleString() ?? '—'}</strong> active learners</li>
          <li><strong>{stats.totalCoursesCreated?.toLocaleString() ?? '—'}</strong> courses created</li>
          <li><strong>{stats.avgEngagementScore ?? '—'}%</strong> avg engagement score</li>
        </ul>
      ) : (
        <p className="text-muted-foreground italic">Loading live stats…</p>
      ),
    },
    {
      n: 10,
      title: 'Team + Ask',
      content: (
        <>
          <p className="mb-2">Seeking <strong>$X seed</strong> for:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>GTM: 3 enterprise sales + pilot success team</li>
            <li>Engineering: AI agent team scale-out</li>
            <li>Infrastructure: Multi-region air-gapped deployment</li>
          </ul>
        </>
      ),
    },
  ];

  return (
    <div data-testid="investor-deck-page" className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">EduSphere — Investor Deck</h1>
            <p className="text-muted-foreground mt-1 text-sm">Confidential — Internal Use Only</p>
          </div>
          <Button
            data-testid="export-deck-pdf-btn"
            variant="outline"
            onClick={() => window.print()}
          >
            Export PDF
          </Button>
        </div>

        <div className="space-y-4">
          {slides.map((slide) => (
            <SlideCard key={slide.n} slide={slide} />
          ))}
        </div>
      </div>
    </div>
  );
}
