import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request, gql } from 'graphql-request';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const GRAPHQL_URL = import.meta.env['VITE_GRAPHQL_URL'] as string ?? '/graphql';

const EARNINGS_QUERY = gql`
  query InstructorEarnings {
    instructorEarnings {
      totalEarnedCents
      pendingPayoutCents
      paidOutCents
      purchases {
        id
        courseId
        amountCents
        status
        purchasedAt
      }
    }
  }
`;

const REQUEST_PAYOUT_MUTATION = gql`
  mutation RequestPayout {
    requestPayout
  }
`;

interface EarningsPurchase {
  id: string;
  courseId: string;
  amountCents: number;
  status: string;
  purchasedAt: string;
}

interface EarningsSummary {
  totalEarnedCents: number;
  pendingPayoutCents: number;
  paidOutCents: number;
  purchases: EarningsPurchase[];
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'COMPLETE') return 'default';
  if (status === 'FAILED') return 'destructive';
  return 'secondary';
}

export function InstructorEarningsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ instructorEarnings: EarningsSummary }>({
    queryKey: ['instructor-earnings'],
    queryFn: () => request(GRAPHQL_URL, EARNINGS_QUERY),
  });

  const { mutate: requestPayout, isPending: isRequestingPayout } = useMutation({
    mutationFn: () => request(GRAPHQL_URL, REQUEST_PAYOUT_MUTATION),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['instructor-earnings'] });
    },
  });

  const earnings = data?.instructorEarnings;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Instructor Earnings</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatCents(earnings?.totalEarnedCents ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">
              {formatCents(earnings?.pendingPayoutCents ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Paid Out</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCents(earnings?.paidOutCents ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end mb-4">
        <Button
          onClick={() => requestPayout()}
          disabled={isRequestingPayout || (earnings?.pendingPayoutCents ?? 0) <= 0}
        >
          {isRequestingPayout ? 'Requesting...' : 'Request Payout'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          {(earnings?.purchases ?? []).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No purchases yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Course</th>
                  <th className="text-right py-2 pr-4">Amount</th>
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {earnings!.purchases.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{p.courseId.slice(0, 8)}...</td>
                    <td className="py-2 pr-4 text-right">{formatCents(p.amountCents)}</td>
                    <td className="py-2 pr-4">{new Date(p.purchasedAt).toLocaleDateString()}</td>
                    <td className="py-2">
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
