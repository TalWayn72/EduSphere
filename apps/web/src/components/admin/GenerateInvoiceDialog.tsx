/**
 * GenerateInvoiceDialog — modal for generating a new invoice.
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerate: (tenantId: string, year: number, plan: string) => void;
}

const currentYear = new Date().getFullYear();

export function GenerateInvoiceDialog({ open, onClose, onGenerate }: Props) {
  const [tenantId, setTenantId] = useState('');
  const [year, setYear] = useState(currentYear);
  const [plan, setPlan] = useState('STARTER');

  const handleSubmit = () => {
    if (!tenantId.trim()) return;
    onGenerate(tenantId.trim(), year, plan);
    setTenantId('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for a tenant.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label htmlFor="inv-tenant" className="text-sm font-medium">
              Tenant ID <span aria-hidden="true" className="text-destructive">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="inv-tenant"
              data-testid="invoice-tenant-input"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="tenant-uuid"
              required
              aria-required="true"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="inv-year" className="text-sm font-medium">Year</label>
              <input
                id="inv-year"
                type="number"
                data-testid="invoice-year-input"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="inv-plan" className="text-sm font-medium">Plan</label>
              <select
                id="inv-plan"
                data-testid="invoice-plan-select"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              >
                <option value="STARTER">STARTER</option>
                <option value="PROFESSIONAL">PROFESSIONAL</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} data-testid="submit-invoice-btn" disabled={!tenantId.trim()}>
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
