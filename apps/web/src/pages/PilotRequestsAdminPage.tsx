/**
 * PilotRequestsAdminPage — SUPER_ADMIN view of all B2B pilot requests.
 * Route: /admin/pilot-requests
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthRole } from '@/hooks/useAuthRole';

const ALL_PILOT_REQUESTS = `
  query AllPilotRequests {
    allPilotRequests {
      __typename id orgName orgType contactEmail estimatedUsers status createdAt
    }
  }
`;
const APPROVE_PILOT = `
  mutation ApprovePilot($requestId: ID!, $seatLimit: Int) {
    approvePilotRequest(requestId: $requestId, seatLimit: $seatLimit) { id plan seatLimit }
  }
`;
const REJECT_PILOT = `
  mutation RejectPilot($requestId: ID!, $reason: String!) {
    rejectPilotRequest(requestId: $requestId, reason: $reason)
  }
`;

interface PilotRequest {
  id: string;
  orgName: string;
  orgType: string;
  contactEmail: string;
  estimatedUsers: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
};

export function PilotRequestsAdminPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [{ data, fetching, error }] = useQuery<{ allPilotRequests: PilotRequest[] }>({
    query: ALL_PILOT_REQUESTS,
    pause: !mounted,
  });

  const [, executeApprove] = useMutation(APPROVE_PILOT);
  const [, executeReject] = useMutation(REJECT_PILOT);

  const [approveTarget, setApproveTarget] = useState<string | null>(null);
  const [seatLimit, setSeatLimit] = useState(100);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (role !== 'SUPER_ADMIN') {
    navigate('/dashboard');
    return null;
  }

  const handleApprove = async () => {
    if (!approveTarget) return;
    await executeApprove({ requestId: approveTarget, seatLimit });
    setApproveTarget(null);
    setSeatLimit(100);
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    await executeReject({ requestId: rejectTarget, reason: rejectReason });
    setRejectTarget(null);
    setRejectReason('');
  };

  const requests: PilotRequest[] = data?.allPilotRequests ?? [];

  return (
    <AdminLayout title="Pilot Requests" description="Review and manage B2B pilot applications">
      <div data-testid="pilot-requests-page">
        {fetching && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
        {error && <p className="text-destructive text-sm py-4">{error.message}</p>}

        {!fetching && requests.length === 0 && (
          <p className="text-muted-foreground text-sm py-8 text-center">No pilot requests yet.</p>
        )}

        {requests.length > 0 && (
          <div className="overflow-x-auto">
            <table data-testid="pilot-requests-table" className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Org Name</th>
                  <th className="pb-3 pr-4 font-medium">Type</th>
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium">Est. Users</th>
                  <th className="pb-3 pr-4 font-medium">Submitted</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 pr-4 font-medium">{req.orgName}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{req.orgType}</td>
                    <td className="py-3 pr-4">{req.contactEmail}</td>
                    <td className="py-3 pr-4">{req.estimatedUsers.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[req.status] ?? ''}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" data-testid={`approve-btn-${req.id}`} onClick={() => setApproveTarget(req.id)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" data-testid={`reject-btn-${req.id}`} onClick={() => setRejectTarget(req.id)}>
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => { if (!open) setApproveTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Pilot Request</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="seatLimit">Seat Limit</Label>
            <Input id="seatLimit" type="number" min={1} value={seatLimit} onChange={(e) => setSeatLimit(Number(e.target.value))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button onClick={handleApprove}>Confirm Approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Pilot Request</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="rejectReason">Reason *</Label>
            <Textarea id="rejectReason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Please provide a reason..." className="min-h-[80px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={handleReject}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
