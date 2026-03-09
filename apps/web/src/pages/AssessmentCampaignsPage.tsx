/**
 * AssessmentCampaignsPage — 360° Assessment learner view.
 * Route: /assessments
 * Tab 1: "My Assessments" — campaigns where I am the subject.
 * Tab 2: "To Review" — campaigns I have been asked to respond to.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList } from 'lucide-react';
import {
  MY_CAMPAIGNS_QUERY,
  CAMPAIGNS_TO_RESPOND_QUERY,
} from '@/lib/graphql/assessment.queries';

interface Campaign {
  id: string;
  title: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  dueDate: string | null;
}

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  DRAFT: 'secondary',
  ACTIVE: 'default',
  COMPLETED: 'outline',
};

export function AssessmentCampaignsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data: myCampaignsData, fetching: fetchingMine }] = useQuery({
    query: MY_CAMPAIGNS_QUERY,
    pause: !mounted,
  });

  const [{ data: respondData, fetching: fetchingRespond }] = useQuery({
    query: CAMPAIGNS_TO_RESPOND_QUERY,
    pause: !mounted,
  });

  const myCampaigns: Campaign[] = (myCampaignsData?.myCampaigns as Campaign[]) ?? [];
  const toRespond: Campaign[] = (respondData?.campaignsToRespond as Campaign[]) ?? [];

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="text-3xl font-bold">360° Assessments</h1>
        </div>

        <Tabs defaultValue="mine">
          <TabsList>
            <TabsTrigger value="mine">My Assessments</TabsTrigger>
            <TabsTrigger value="respond">To Review</TabsTrigger>
          </TabsList>

          {/* ── My Assessments tab ─────────────────────────────────── */}
          <TabsContent value="mine" className="mt-4">
            {(!mounted || fetchingMine) && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            )}
            {mounted && !fetchingMine && myCampaigns.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No assessments targeting you yet.
                </CardContent>
              </Card>
            )}
            {mounted && !fetchingMine && myCampaigns.length > 0 && (
              <div className="space-y-3">
                {myCampaigns.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{c.title}</p>
                        {c.dueDate && (
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(c.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={statusVariant[c.status] ?? 'secondary'}>
                          {c.status}
                        </Badge>
                        {c.status === 'COMPLETED' && (
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/assessments/${c.id}/results`}>View Results</Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── To Review tab ──────────────────────────────────────── */}
          <TabsContent value="respond" className="mt-4">
            {(!mounted || fetchingRespond) && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            )}
            {mounted && !fetchingRespond && toRespond.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No assessments pending your response.
                </CardContent>
              </Card>
            )}
            {mounted && !fetchingRespond && toRespond.length > 0 && (
              <div className="space-y-3">
                {toRespond.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{c.title}</p>
                        {c.dueDate && (
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(c.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={statusVariant[c.status] ?? 'secondary'}>
                          {c.status}
                        </Badge>
                        <Button size="sm" asChild>
                          <Link to={`/assessments/${c.id}/respond`}>Respond</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

export default AssessmentCampaignsPage;
