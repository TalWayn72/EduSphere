import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...p }: any) => <div {...p}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

import { vi } from 'vitest';
import { PartnerRevenueTable } from './PartnerRevenueTable';

const REVENUE = [
  { month: "2026-01", grossRevenue: 1000, platformCut: 200, payout: 800, status: "PAID" as const },
  { month: "2026-02", grossRevenue: 1500, platformCut: 300, payout: 1200, status: "PENDING" as const },
];

describe('PartnerRevenueTable', () => {
  it('shows empty state when no revenue', () => {
    render(<PartnerRevenueTable revenue={[]} />);
    expect(screen.getByText(/No revenue data/i)).toBeInTheDocument();
  });

  it('renders revenue rows', () => {
    render(<PartnerRevenueTable revenue={REVENUE} />);
    expect(screen.getByText("2026-01")).toBeInTheDocument();
    expect(screen.getByText("PAID")).toBeInTheDocument();
  });

  it('shows payout amounts', () => {
    render(<PartnerRevenueTable revenue={REVENUE} />);
    expect(document.body.textContent).toContain("800");
  });
});