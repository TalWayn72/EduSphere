import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('lucide-react', () => ({ ClipboardList: () => <span />, Clock: () => <span />, Rocket: () => <span />, ChevronRight: () => <span /> }));
vi.mock('@/components/ui/button', () => ({ Button: (p: Record<string, unknown>) => <button {...p} /> }));

import { HowPilotWorksSection } from './HowPilotWorksSection';

describe('HowPilotWorksSection', () => {
  it('renders section with testid', () => {
    render(<MemoryRouter><HowPilotWorksSection /></MemoryRouter>);
    expect(screen.getByTestId("how-pilot-works-section")).toBeInTheDocument();
  });

  it('has accessible section label', () => {
    render(<MemoryRouter><HowPilotWorksSection /></MemoryRouter>);
    expect(screen.getByLabelText("How the 90-day pilot works")).toBeInTheDocument();
  });
});