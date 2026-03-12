/**
 * StripeInvoicePage — Invoice history and generation for SUPER_ADMIN.
 * Route: /admin/invoices
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthRole } from '@/hooks/useAuthRole';

type InvoiceStatus = 'draft' | 'paid' | 'overdue';

interface Invoice {
  id: string;
  tenant: string;
  plan: string;
  year: number;
  amount: number;
  status: InvoiceStatus;
  pdfUrl: string;
}

const MOCK_INVOICES: Invoice[] = [
  { id: 'inv-001', tenant: 'Acme University', plan: 'ENTERPRISE', year: 2025, amount: 12000, status: 'paid', pdfUrl: '#' },
  { id: 'inv-002', tenant: 'TechCorp Inc', plan: 'PROFESSIONAL', year: 2025, amount: 4800, status: 'overdue', pdfUrl: '#' },
  { id: 'inv-003', tenant: 'Global Learn', plan: 'STARTER', year: 2026, amount: 1200, status: 'draft', pdfUrl: '#' },
];

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

export function StripeInvoicePage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [modalOpen, setModalOpen] = useState(false);

  if (!role || role !== 'SUPER_ADMIN') {
    navigate('/dashboard');
    return (
      <div data-testid="access-denied" className="p-8 text-center text-destructive">
        Access Denied — SUPER_ADMIN role required.
      </div>
    );
  }

  return (
    <AdminLayout title="Stripe Invoices" description="Manage tenant invoices and billing">
      <div data-testid="stripe-invoice-page" className="space-y-6">
        {/* Setup notice */}
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="py-4">
            <p data-testid="stripe-setup-notice" className="text-sm text-yellow-800">
              ⚠️ Stripe integration requires STRIPE_SECRET_KEY in environment
            </p>
          </CardContent>
        </Card>

        {/* Invoice table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Invoice History</CardTitle>
            <Button
              data-testid="generate-invoice-btn"
              onClick={() => setModalOpen(true)}
            >
              Generate Invoice
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table data-testid="invoice-history-table" className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Tenant</th>
                    <th className="pb-3 pr-4 font-medium">Plan</th>
                    <th className="pb-3 pr-4 font-medium">Year</th>
                    <th className="pb-3 pr-4 font-medium">Amount</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_INVOICES.map((inv) => (
                    <tr key={inv.id} className="border-b hover:bg-muted/30">
                      <td className="py-3 pr-4">{inv.tenant}</td>
                      <td className="py-3 pr-4">{inv.plan}</td>
                      <td className="py-3 pr-4">{inv.year}</td>
                      <td className="py-3 pr-4">${inv.amount.toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[inv.status]}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <a href={inv.pdfUrl} className="text-primary underline text-xs">
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Modal stub */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <Card className="w-96">
              <CardHeader>
                <CardTitle>Generate Invoice</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Select tenant and billing period.</p>
                <Button variant="outline" onClick={() => setModalOpen(false)}>Close</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
