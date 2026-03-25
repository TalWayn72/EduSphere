import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...p }: { children: React.ReactNode; [k:string]:unknown }) => <div {...p}>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

import { vi } from 'vitest';
import { InvestorSlides } from './InvestorSlides';

const STATS = { totalTenants: 5, totalLearners: 10000, totalCoursesCreated: 500, avgEngagementScore: 78 };

describe('InvestorSlides', () => {
  it('renders slide cards', () => {
    render(<InvestorSlides stats={STATS} />);
    expect(screen.getByTestId("slide-1")).toBeInTheDocument();
  });

  it('displays platform stats', () => {
    render(<InvestorSlides stats={STATS} />);
    expect(document.body.textContent).toContain("10,000");
  });
});