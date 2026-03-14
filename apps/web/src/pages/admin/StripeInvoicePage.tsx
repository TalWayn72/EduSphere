/**
 * StripeInvoicePage — Invoice history and generation for SUPER_ADMIN.
 * Route: /admin/invoices
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthRole } from '@/hooks/useAuthRole';
import { InvoiceTable } from '@/components/admin/InvoiceTable';
import { GenerateInvoiceDialog } from '@/components/admin/GenerateInvoiceDialog';

const INVOICES_QUERY = `
  query Invoices {
    invoices {
      id
      tenant
      plan
      year
      amount
      status
      pdfUrl
    }
  }
`;

const GENERATE_INVOICE_MUTATION = `
  mutation GenerateInvoice($tenantId: ID!, $year: Int!, $plan: String!) {
    generateInvoice(tenantId: $tenantId, year: $year, plan: $plan) {
      id
      tenant
      plan
      year
      amount
      status
      pdfUrl
    }
  }
`;

export type InvoiceStatus = 'draft' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  tenant: string;
  plan: string;
  year: number;
  amount: number;
  status: InvoiceStatus;
  pdfUrl: string;
}

export function StripeInvoicePage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const [result, reexecute] = useQuery<{ invoices: Invoice[] }>({
    query: INVOICES_QUERY,
    pause: !mounted,
  });

  const [, generateInvoice] = useMutation(GENERATE_INVOICE_MUTATION);

  if (!role || role !== 'SUPER_ADMIN') {
    navigate('/dashboard');
    return (
      <div data-testid="access-denied" className="p-8 text-center text-destructive">
        Access Denied — SUPER_ADMIN role required.
      </div>
    );
  }

  const { data, fetching, error } = result;
  const invoices = data?.invoices ?? [];

  const handleGenerate = async (tenantId: string, year: number, plan: string) => {
    await generateInvoice({ tenantId, year, plan });
    setModalOpen(false);
    reexecute({ requestPolicy: 'network-only' });
  };

  return (
    <AdminLayout title="Stripe Invoices" description="Manage tenant invoices and billing">
      <div data-testid="stripe-invoice-page" className="space-y-6">
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="py-4">
            <p data-testid="stripe-setup-notice" className="text-sm text-yellow-800">
              Stripe integration requires STRIPE_SECRET_KEY in environment
            </p>
          </CardContent>
        </Card>

        {fetching && (
          <div className="space-y-4" data-testid="invoice-skeleton">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        )}

        {error && !fetching && (
          <Card>
            <CardContent className="py-8 text-center text-destructive text-sm">
              Failed to load invoices. Please try again later.
            </CardContent>
          </Card>
        )}

        {!fetching && !error && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Invoice History</CardTitle>
              <Button data-testid="generate-invoice-btn" onClick={() => setModalOpen(true)}>
                Generate Invoice
              </Button>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground text-sm" data-testid="empty-state">
                  No invoices found.
                </p>
              ) : (
                <InvoiceTable invoices={invoices} />
              )}
            </CardContent>
          </Card>
        )}

        <GenerateInvoiceDialog
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onGenerate={handleGenerate}
        />
      </div>
    </AdminLayout>
  );
}
