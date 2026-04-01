/**
 * AssessmentCampaignPage — F-030: 360° Multi-Rater Assessments
 * Route: /admin/assessments
 * Admin dashboard to manage campaigns: create, activate, complete.
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Users } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
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

function CampaignRow({
  c,
  onActivate,
  onComplete,
}: {
  c: Campaign;
  onActivate: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const { t } = useTranslation('admin');
  return (
    <div className="py-3 flex items-center justify-between">
      <div>
        <p className="font-medium text-sm">{c.title}</p>
        <p className="text-xs text-muted-foreground">
          {t('assessmentCampaign.target')} {c.targetUserId} · {c.criteriaCount}{' '}
          {t('assessmentCampaign.criteria')}
          {c.dueDate
            ? ` · ${t('assessmentCampaign.due')} ${new Date(c.dueDate).toLocaleDateString()}`
            : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={statusVariant[c.status] ?? 'secondary'}>
          {c.status}
        </Badge>
        {c.status === 'DRAFT' && (
          <Button size="sm" variant="outline" onClick={() => onActivate(c.id)}>
            {t('assessmentCampaign.activate')}
          </Button>
        )}
        {c.status === 'ACTIVE' && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onComplete(c.id)}
          >
            {t('assessmentCampaign.closeAndGenerate')}
          </Button>
        )}
      </div>
    </div>
  );
}

export function AssessmentCampaignPage() {
  const { t } = useTranslation('admin');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }, refetch] = useQuery({
    query: MY_CAMPAIGNS_QUERY,
    pause: !mounted,
  });
  const [{ fetching: creating }, createCampaign] = useMutation(
    CREATE_CAMPAIGN_MUTATION
  );
  const [, activate] = useMutation(ACTIVATE_CAMPAIGN_MUTATION);
  const [, complete] = useMutation(COMPLETE_CAMPAIGN_MUTATION);

  const campaigns: Campaign[] = data?.myCampaigns ?? [];

  async function handleCreate() {
    if (!title.trim() || !targetUserId.trim()) return;
    await createCampaign({
      title,
      targetUserId,
      dueDate: dueDate || undefined,
    });
    setTitle('');
    setTargetUserId('');
    setDueDate('');
    setOpen(false);
    refetch({ requestPolicy: 'network-only' });
  }

  return (
    <Layout>
      <PageShell size="md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">
              {t('assessmentCampaign.pageTitle')}
            </h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('assessmentCampaign.newCampaign')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('assessmentCampaign.createTitle')}</DialogTitle>
                <DialogDescription className="sr-only">
                  Create a new 360° assessment campaign.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-sm font-medium">
                    {t('assessmentCampaign.campaignTitleLabel')}
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t(
                      'assessmentCampaign.campaignTitlePlaceholder'
                    )}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t('assessmentCampaign.targetUserIdLabel')}
                  </label>
                  <Input
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    placeholder={t(
                      'assessmentCampaign.targetUserIdPlaceholder'
                    )}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t('assessmentCampaign.dueDateLabel')}
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => void handleCreate()}
                  disabled={creating}
                  className="w-full"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {t('assessmentCampaign.createCampaign')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('assessmentCampaign.allCampaigns')}</CardTitle>
          </CardHeader>
          <CardContent>
            {fetching && (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin h-4 w-4" />
                <span>{t('assessmentCampaign.loading')}</span>
              </div>
            )}
            {!fetching && campaigns.length === 0 && (
              <p className="text-muted-foreground text-sm">
                {t('assessmentCampaign.noCampaigns')}
              </p>
            )}
            <div className="divide-y">
              {campaigns.map((c) => (
                <CampaignRow
                  key={c.id}
                  c={c}
                  onActivate={(id) => {
                    void activate({ campaignId: id }).then(() =>
                      refetch({ requestPolicy: 'network-only' })
                    );
                  }}
                  onComplete={(id) => {
                    void complete({ campaignId: id }).then(() =>
                      refetch({ requestPolicy: 'network-only' })
                    );
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </PageShell>
    </Layout>
  );
}
