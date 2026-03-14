/**
 * InvestorDeckPage — SUPER_ADMIN only internal investor deck.
 * Route: /internal/investor-deck
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthRole } from '@/hooks/useAuthRole';
import { usePageTitle } from '@/hooks/usePageTitle';
import { InvestorSlides } from '@/components/investor/InvestorSlides';

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

interface PlatformStats {
  totalTenants: number;
  totalLearners: number;
  totalCoursesCreated: number;
  avgEngagementScore: number;
}

export function InvestorDeckPage() {
  usePageTitle('Investor Deck (Internal)');
  const role = useAuthRole();
  const navigate = useNavigate();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [result] = useQuery<{ platformLiveStats: PlatformStats }>({
    query: PLATFORM_LIVE_STATS_QUERY,
    pause: !mounted,
  });

  const { data, fetching } = result;
  const stats = data?.platformLiveStats;

  if (role !== 'SUPER_ADMIN') {
    return (
      <div data-testid="investor-deck-page" className="min-h-screen flex items-center justify-center bg-background">
        <div data-testid="access-denied" className="text-center space-y-4">
          <p className="text-4xl">&#128274;</p>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">This page is restricted to SUPER_ADMIN users only.</p>
          <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="investor-deck-page" className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">EduSphere — Investor Deck</h1>
            <p className="text-muted-foreground mt-1 text-sm">Confidential — Internal Use Only</p>
          </div>
          <Button data-testid="export-deck-pdf-btn" variant="outline" onClick={() => window.print()}>
            Export PDF
          </Button>
        </div>

        {fetching && (
          <div className="space-y-4" data-testid="investor-skeleton">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        )}

        {!fetching && <InvestorSlides stats={stats ?? null} />}
      </div>
    </div>
  );
}
