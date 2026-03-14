/**
 * PartnerRevenueTable — revenue breakdown table for partner dashboard.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RevenueRow {
  month: string;
  grossRevenue: number;
  platformCut: number;
  payout: number;
  status: 'PAID' | 'PENDING' | 'PROCESSING';
}

const ROW_STATUS_BADGE: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
};

export function PartnerRevenueTable({ revenue }: { revenue: RevenueRow[] }) {
  if (revenue.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          No revenue data available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader><CardTitle>Revenue (Last 12 Months)</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table data-testid="revenue-table" className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Month</th>
                <th className="pb-3 pr-4 font-medium">Gross Revenue</th>
                <th className="pb-3 pr-4 font-medium">Platform Cut (30%)</th>
                <th className="pb-3 pr-4 font-medium">Your Payout (70%)</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {revenue.map((row) => (
                <tr key={row.month} className="border-b hover:bg-muted/30">
                  <td className="py-3 pr-4">{row.month}</td>
                  <td className="py-3 pr-4">${row.grossRevenue.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-muted-foreground">${row.platformCut.toLocaleString()}</td>
                  <td className="py-3 pr-4 font-semibold text-green-700">${row.payout.toLocaleString()}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${ROW_STATUS_BADGE[row.status] ?? ''}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
