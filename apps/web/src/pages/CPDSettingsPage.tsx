/**
 * CPDSettingsPage — Admin management of credit types and course assignments.
 * Route: /admin/cpd
 * Access: ORG_ADMIN, SUPER_ADMIN only
 * F-027: CPD/CE Credit Tracking + Regulatory Export
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CPD_CREDIT_TYPES_QUERY,
  CREATE_CPD_CREDIT_TYPE_MUTATION,
  ASSIGN_CPD_CREDITS_MUTATION,
} from '@/lib/graphql/cpd.queries';
import { useTranslation } from 'react-i18next';
import { Settings, Plus, Loader2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageShell } from '@/components/PageShell';

interface CpdCreditType {
  id: string;
  name: string;
  regulatoryBody: string;
  creditHoursPerHour: number;
  isActive: boolean;
}

export function CPDSettingsPage() {
  const { t } = useTranslation('admin');
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [name, setName] = useState('');
  const [regulatoryBody, setRegulatoryBody] = useState('');
  const [creditHoursPerHour, setCreditHoursPerHour] = useState('1.00');
  const [courseId, setCourseId] = useState('');
  const [selectedCreditTypeId, setSelectedCreditTypeId] = useState('');
  const [creditHours, setCreditHours] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [{ data, fetching }] = useQuery<{ cpdCreditTypes: CpdCreditType[] }>({
    query: CPD_CREDIT_TYPES_QUERY,
    pause: !mounted,
  });

  const [, createCreditType] = useMutation(CREATE_CPD_CREDIT_TYPE_MUTATION);
  const [, assignCredits] = useMutation(ASSIGN_CPD_CREDITS_MUTATION);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCreditType({
        name,
        regulatoryBody,
        creditHoursPerHour: parseFloat(creditHoursPerHour),
      });
      setName('');
      setRegulatoryBody('');
      setCreditHoursPerHour('1.00');
      setCreateOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await assignCredits({
        courseId,
        creditTypeId: selectedCreditTypeId,
        creditHours: parseFloat(creditHours),
      });
      setCourseId('');
      setSelectedCreditTypeId('');
      setCreditHours('');
      setAssignOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  const creditTypes = data?.cpdCreditTypes ?? [];

  return (
    <Layout>
      <PageShell size="lg" className="p-6">
        <Breadcrumbs
          items={[
            { label: t('cpd.breadcrumbAdmin'), href: '/admin' },
            { label: t('cpd.breadcrumbCpd') },
          ]}
        />
        <div className="flex items-center gap-3">
          <Settings className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">{t('cpd.pageTitle')}</h1>
            <p className="text-muted-foreground text-sm">
              {t('cpd.pageDescription')}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('cpd.creditTypes')}</CardTitle>
              <div className="flex gap-2">
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      {t('cpd.newCreditType')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('cpd.createCreditTypeTitle')}</DialogTitle>
                      <DialogDescription className="sr-only">Define a new CPD credit type and regulatory body.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                      <div>
                        <Label htmlFor="name">{t('cpd.nameLabel')}</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={t('cpd.namePlaceholder')}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="regBody">{t('cpd.regulatoryBodyLabel')}</Label>
                        <Input
                          id="regBody"
                          value={regulatoryBody}
                          onChange={(e) => setRegulatoryBody(e.target.value)}
                          placeholder={t('cpd.regulatoryBodyPlaceholder')}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="ratio">{t('cpd.creditHoursPerHourLabel')}</Label>
                        <Input
                          id="ratio"
                          type="number"
                          step="0.01"
                          min="0"
                          value={creditHoursPerHour}
                          onChange={(e) =>
                            setCreditHoursPerHour(e.target.value)
                          }
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="w-full"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {t('cpd.create')}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      {t('cpd.assignToCourse')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('cpd.assignCpdTitle')}</DialogTitle>
                      <DialogDescription className="sr-only">Assign CPD credits to a course.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAssign} className="space-y-4">
                      <div>
                        <Label htmlFor="courseId">{t('cpd.courseIdLabel')}</Label>
                        <Input
                          id="courseId"
                          value={courseId}
                          onChange={(e) => setCourseId(e.target.value)}
                          placeholder={t('cpd.courseIdPlaceholder')}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="creditType">{t('cpd.creditTypeLabel')}</Label>
                        <select
                          id="creditType"
                          value={selectedCreditTypeId}
                          onChange={(e) =>
                            setSelectedCreditTypeId(e.target.value)
                          }
                          className="w-full border rounded px-3 py-2 text-sm"
                          required
                        >
                          <option value="">{t('cpd.selectCreditType')}</option>
                          {creditTypes.map((ct) => (
                            <option key={ct.id} value={ct.id}>
                              {ct.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="hours">{t('cpd.creditHoursLabel')}</Label>
                        <Input
                          id="hours"
                          type="number"
                          step="0.5"
                          min="0"
                          value={creditHours}
                          onChange={(e) => setCreditHours(e.target.value)}
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="w-full"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {t('cpd.assign')}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> {t('cpd.loading')}
              </div>
            ) : creditTypes.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                {t('cpd.noCreditTypes')}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium">{t('cpd.colName')}</th>
                    <th className="text-left p-2 font-medium">
                      {t('cpd.colRegulatoryBody')}
                    </th>
                    <th className="text-left p-2 font-medium">{t('cpd.colHoursPerHour')}</th>
                    <th className="text-left p-2 font-medium">{t('cpd.colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {creditTypes.map((ct) => (
                    <tr key={ct.id} className="border-t">
                      <td className="p-2 font-medium">{ct.name}</td>
                      <td className="p-2">{ct.regulatoryBody}</td>
                      <td className="p-2 font-mono">
                        {ct.creditHoursPerHour.toFixed(2)}
                      </td>
                      <td className="p-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${ct.isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}
                        >
                          {ct.isActive ? t('cpd.statusActive') : t('cpd.statusInactive')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </PageShell>
    </Layout>
  );
}
