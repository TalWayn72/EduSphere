/**
 * InvoiceTable — renders the invoice history table.
 */
import React from 'react';
import type { Invoice, InvoiceStatus } from '@/pages/admin/StripeInvoicePage';

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="overflow-x-auto">
      <table data-testid="invoice-history-table" className="w-full text-sm" aria-label="Invoice history">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th scope="col" className="pb-3 pr-4 font-medium">Tenant</th>
            <th scope="col" className="pb-3 pr-4 font-medium">Plan</th>
            <th scope="col" className="pb-3 pr-4 font-medium">Year</th>
            <th scope="col" className="pb-3 pr-4 font-medium">Amount</th>
            <th scope="col" className="pb-3 pr-4 font-medium">Status</th>
            <th scope="col" className="pb-3 font-medium">PDF</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
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
                {inv.pdfUrl && inv.pdfUrl !== '#' ? (
                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline text-xs"
                    data-testid={`download-pdf-${inv.id}`}
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">Pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
