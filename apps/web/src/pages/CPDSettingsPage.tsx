/**
 * CPDSettingsPage — Admin management of credit types and course assignments.
 * Route: /admin/cpd
 * Access: ORG_ADMIN, SUPER_ADMIN only
 * F-027: CPD/CE Credit Tracking + Regulatory Export
 */
import React, { useState } from 'react';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CPD_CREDIT_TYPES_QUERY,
  CREATE_CPD_CREDIT_TYPE_MUTATION,
  ASSIGN_CPD_CREDITS_MUTATION,
} from '@/lib/graphql/cpd.queries';
import { Settings, Plus, Loader2 } from 'lucide-react';

interface CpdCreditType {
  id: string;
  name: string;
  regulatoryBody: string;
  creditHoursPerHour: number;
  isActive: boolean;
}

export function CPDSettingsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [name, setName] = useState('');
  const [regulatoryBody, setRegulatoryBody] = useState('');
  const [creditHoursPerHour, setCreditHoursPerHour] = useState('1.00');
  const [courseId, setCourseId] = useState('');
  const [selectedCreditTypeId, setSelectedCreditTypeId] = useState('');
  const [creditHours, setCreditHours] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [{ data, fetching }] = useQuery<{ cpdCreditTypes: CpdCreditType[] }>({
    query: CPD_CREDIT_TYPES_QUERY,
  });

  const [, createCreditType] = useMutation(CREATE_CPD_CREDIT_TYPE_MUTATION);
  const [, assignCredits] = useMutation(ASSIGN_CPD_CREDITS_MUTATION);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCreditType({ name, regulatoryBody, creditHoursPerHour: parseFloat(creditHoursPerHour) });
      setName(''); setRegulatoryBody(''); setCreditHoursPerHour('1.00');
      setCreateOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await assignCredits({ courseId, creditTypeId: selectedCreditTypeId, creditHours: parseFloat(creditHours) });
      setCourseId(''); setSelectedCreditTypeId(''); setCreditHours('');
      setAssignOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  const creditTypes = data?.cpdCreditTypes ?? [];

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">CPD Settings</h1>
            <p className="text-muted-foreground text-sm">Manage credit types and course CPD assignments</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Credit Types</CardTitle>
              <div className="flex gap-2">
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Credit Type</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create Credit Type</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                      <div><Label htmlFor="name">Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="NASBA CPE" required /></div>
                      <div><Label htmlFor="regBody">Regulatory Body</Label><Input id="regBody" value={regulatoryBody} onChange={(e) => setRegulatoryBody(e.target.value)} placeholder="NASBA" required /></div>
                      <div><Label htmlFor="ratio">Credit Hours per Hour</Label><Input id="ratio" type="number" step="0.01" min="0" value={creditHoursPerHour} onChange={(e) => setCreditHoursPerHour(e.target.value)} required /></div>
                      <Button type="submit" disabled={submitting} className="w-full">{submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create</Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Assign to Course</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Assign CPD Credits to Course</DialogTitle></DialogHeader>
                    <form onSubmit={handleAssign} className="space-y-4">
                      <div><Label htmlFor="courseId">Course ID</Label><Input id="courseId" value={courseId} onChange={(e) => setCourseId(e.target.value)} placeholder="UUID" required /></div>
                      <div>
                        <Label htmlFor="creditType">Credit Type</Label>
                        <select id="creditType" value={selectedCreditTypeId} onChange={(e) => setSelectedCreditTypeId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required>
                          <option value="">Select credit type...</option>
                          {creditTypes.map((ct) => (<option key={ct.id} value={ct.id}>{ct.name}</option>))}
                        </select>
                      </div>
                      <div><Label htmlFor="hours">Credit Hours</Label><Input id="hours" type="number" step="0.5" min="0" value={creditHours} onChange={(e) => setCreditHours(e.target.value)} required /></div>
                      <Button type="submit" disabled={submitting} className="w-full">{submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Assign</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
            ) : creditTypes.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No credit types defined yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium">Name</th>
                    <th className="text-left p-2 font-medium">Regulatory Body</th>
                    <th className="text-left p-2 font-medium">Hours/Hour</th>
                    <th className="text-left p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {creditTypes.map((ct) => (
                    <tr key={ct.id} className="border-t">
                      <td className="p-2 font-medium">{ct.name}</td>
                      <td className="p-2">{ct.regulatoryBody}</td>
                      <td className="p-2 font-mono">{ct.creditHoursPerHour.toFixed(2)}</td>
                      <td className="p-2"><span className={`text-xs px-2 py-0.5 rounded-full ${ct.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{ct.isActive ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
