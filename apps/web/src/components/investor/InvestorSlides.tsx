/**
 * InvestorSlides — slide cards for the investor deck page.
 * Extracted to keep InvestorDeckPage under 150 lines.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlatformStats {
  totalTenants: number;
  totalLearners: number;
  totalCoursesCreated: number;
  avgEngagementScore: number;
}

interface Slide {
  n: number;
  title: string;
  content: React.ReactNode;
}

function SlideCard({ slide }: { slide: Slide }) {
  return (
    <Card data-testid={`slide-${slide.n}`} className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex flex-row items-center gap-4 py-4">
        <span role="presentation" aria-hidden="true" className="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
          {slide.n}
        </span>
        <CardTitle className="text-white text-lg">{slide.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 text-sm text-foreground">{slide.content}</CardContent>
    </Card>
  );
}

function buildSlides(stats: PlatformStats | null): Slide[] {
  return [
    { n: 1, title: 'EduSphere — AI-Native LMS for the Knowledge Economy', content: <p>The world&apos;s first Knowledge Graph-powered LMS with native GraphRAG, Visual Anchoring, and AI tutors — purpose-built for organizations that treat knowledge as a strategic asset.</p> },
    { n: 2, title: 'Problem', content: <p>Organizations lose <strong>25% of revenue</strong> to undocumented knowledge. Traditional LMS tools capture courses, not expertise.</p> },
    { n: 3, title: 'Solution', content: <p>GraphRAG + Visual Anchoring + AI Tutor in one platform. EduSphere automatically maps expertise into a living Knowledge Graph.</p> },
    { n: 4, title: 'Why Now', content: <p>AI-Driven KM market: <strong>$9.6B to $237B by 2034 (CAGR 43.7%)</strong>. Generative AI has made knowledge graph construction 10x cheaper.</p> },
    { n: 5, title: 'Product — Top 3 Differentiators', content: (
      <ul className="list-disc pl-4 space-y-1">
        <li><strong>GraphRAG:</strong> Semantic search fused with Apache AGE knowledge graph traversal</li>
        <li><strong>Visual Anchoring:</strong> Embed knowledge anchors into images, videos, and 3D models</li>
        <li><strong>AI Tutor:</strong> Socratic + Chavruta debate agents powered by LangGraph.js</li>
      </ul>
    ) },
    { n: 6, title: 'Business Model', content: (
      <ul className="list-disc pl-4 space-y-1">
        <li><strong>B2B SaaS:</strong> $12K-$65K/yr institutional contracts</li>
        <li><strong>B2B2C Marketplace:</strong> 30% RevShare — partners keep 70%</li>
        <li><strong>Pilot Funnel:</strong> 90-day free pilot with 70% conversion rate</li>
      </ul>
    ) },
    { n: 7, title: 'Go-to-Market', content: <p>90-day free pilot generates organic champions inside organizations who drive board-level procurement decisions.</p> },
    { n: 8, title: 'Competition', content: <p>Only platform with <strong>native Knowledge Graph</strong> + <strong>Air-Gapped deployment</strong> + <strong>Visual Anchoring</strong>.</p> },
    { n: 9, title: 'Traction', content: stats ? (
      <ul className="list-disc pl-4 space-y-1">
        <li><strong>{stats.totalTenants.toLocaleString()}</strong> organizations onboarded</li>
        <li><strong>{stats.totalLearners.toLocaleString()}</strong> active learners</li>
        <li><strong>{stats.totalCoursesCreated.toLocaleString()}</strong> courses created</li>
        <li><strong>{stats.avgEngagementScore}%</strong> avg engagement score</li>
      </ul>
    ) : <p className="text-muted-foreground italic">Stats unavailable</p> },
    { n: 10, title: 'Team + Ask', content: (
      <>
        <p className="mb-2">Seeking <strong>$X seed</strong> for:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>GTM: 3 enterprise sales + pilot success team</li>
          <li>Engineering: AI agent team scale-out</li>
          <li>Infrastructure: Multi-region air-gapped deployment</li>
        </ul>
      </>
    ) },
  ];
}

export function InvestorSlides({ stats }: { stats: PlatformStats | null }) {
  const slides = buildSlides(stats);
  return (
    <div className="space-y-4">
      {slides.map((slide) => <SlideCard key={slide.n} slide={slide} />)}
    </div>
  );
}
