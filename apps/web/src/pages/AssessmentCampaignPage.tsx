/**
 * AssessmentCampaignPage — F-030: 360° Multi-Rater Assessments
 * Route: /admin/assessments
 * Admin dashboard to manage campaigns: create, activate, complete.
 */
import React, { useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Users } from 'lucide-react';
import {
  MY_CAMPAIGNS_QUERY,
  CREATE_CAMPAIGN_MUTATION,
  ACTIVATE_CAMPAIGN_MUTATION,
  COMPLETE_CAMPAIGN_MUTATION,
} from '@/lib/graphql/assessment.queries';

interface Campaign {
  id: string;
  title: string;
  targetUserId: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  dueDate: string | null;
  criteriaCount: number;
}

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  DRAFT: 'secondary',
  ACTIVE: 'default',
  COMPLETED: 'outline',
};

function CampaignRow({ c, onActivate, onComplete }: {
  c: Campaign;
  onActivate: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  return (
    <div className="py-3 flex items-center justify-between">
      <div>
        <p className="font-medium text-sm">{c.title}</p>
        <p className="text-xs text-muted-foreground">
          Target: {c.targetUserId} · {c.criteriaCount} criteria
          {c.dueDate ? ` · Due: ${new Date(c.dueDate).toLocaleDateString()}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={statusVariant[c.status] ?? 'secondary'}>{c.status}</Badge>
        {c.status === 'DRAFT' && (
          <Button size="sm" variant="outline" onClick={() => onActivate(c.id)}>Activate</Button>
        )}
        {c.status === 'ACTIVE' && (
          <Button size="sm" variant="destructive" onClick={() => onComplete(c.id)}>Close & Generate</Button>
        )}
      </div>
    </div>
  );
}

export function AssessmentCampaignPage() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [{ data, fetching }, refetch] = useQuery({ query: MY_CAMPAIGNS_QUERY });
  const [{ fetching: creating }, createCampaign] = useMutation(CREATE_CAMPAIGN_MUTATION);
  const [, activate] = useMutation(ACTIVATE_CAMPAIGN_MUTATION);
  const [, complete] = useMutation(COMPLETE_CAMPAIGN_MUTATION);

  const campaigns: Campaign[] = data?.myCampaigns ?? [];

  async function handleCreate() {
    if (!title.trim() || !targetUserId.trim()) return;
    await createCampaign({ title, targetUserId, dueDate: dueDate || undefined });
    setTitle(''); setTargetUserId(''); setDueDate('');
    setOpen(false);
    refetch({ requestPolicy: 'network-only' });
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">360 Assessment Campaigns</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Campaign</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Assessment Campaign</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-sm font-medium">Campaign Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Q1 Performance Review" />
                </div>
                <div>
                  <label className="text-sm font-medium">Target User ID</label>
                  <Input value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="uuid-of-user" />
                </div>
                <div>
                  <label className="text-sm font-medium">Due Date (optional)</label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <Button onClick={() => void handleCreate()} disabled={creating} className="w-full">
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Create Campaign
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle>All Campaigns</CardTitle></CardHeader>
          <CardContent>
            {fetching && <div className="flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /><span>Loading...</span></div>}
            {!fetching && campaigns.length === 0 && (
              <p className="text-muted-foreground text-sm">No campaigns yet. Create one to get started.</p>
            )}
            <div className="divide-y">
              {campaigns.map((c) => (
                <CampaignRow
                  key={c.id}
                  c={c}
                  onActivate={(id) => { void activate({ campaignId: id }).then(() => refetch({ requestPolicy: 'network-only' })); }}
                  onComplete={(id) => { void complete({ campaignId: id }).then(() => refetch({ requestPolicy: 'network-only' })); }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
