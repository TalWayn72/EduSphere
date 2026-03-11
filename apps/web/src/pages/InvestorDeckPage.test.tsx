import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvestorDeckPage } from './InvestorDeckPage';

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof import('urql')>();
  return {
    ...actual,
    useQuery: vi.fn(() => [{ fetching: false, data: null, error: undefined }]),
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});

const mockUseAuthRole = vi.fn(() => 'SUPER_ADMIN' as string | null);
vi.mock('@/hooks/useAuthRole', () => ({ useAuthRole: () => mockUseAuthRole() }));

function renderPage() {
  return render(
    <MemoryRouter>
      <InvestorDeckPage />
    </MemoryRouter>
  );
}

describe('InvestorDeckPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthRole.mockReturnValue('SUPER_ADMIN');
  });

  it('shows access denied for non-SUPER_ADMIN', () => {
    mockUseAuthRole.mockReturnValue('ORG_ADMIN');
    renderPage();
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });

  it('does not show slides for non-SUPER_ADMIN', () => {
    mockUseAuthRole.mockReturnValue('STUDENT');
    renderPage();
    expect(screen.queryByTestId('slide-1')).not.toBeInTheDocument();
  });

  it('renders all 10 slide cards for SUPER_ADMIN', () => {
    renderPage();
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByTestId(`slide-${i}`)).toBeInTheDocument();
    }
  });

  it('shows slide 4 with TAM data', () => {
    renderPage();
    const slide4 = screen.getByTestId('slide-4');
    expect(slide4).toHaveTextContent(/\$9\.6B.*\$237B.*2034/i);
  });

  it('shows slide 6 with pricing info', () => {
    renderPage();
    const slide6 = screen.getByTestId('slide-6');
    expect(slide6).toHaveTextContent(/\$12K.*\$65K/i);
    expect(slide6).toHaveTextContent(/30% RevShare/i);
  });

  it('export PDF button is present for SUPER_ADMIN', () => {
    renderPage();
    expect(screen.getByTestId('export-deck-pdf-btn')).toBeInTheDocument();
  });

  it('investor-deck-page test id is present', () => {
    renderPage();
    expect(screen.getByTestId('investor-deck-page')).toBeInTheDocument();
  });

  it('does not show raw error messages to the user', () => {
    renderPage();
    expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/at Object\./)).not.toBeInTheDocument();
  });

  it('shows slide 1 with product title', () => {
    renderPage();
    const slide1 = screen.getByTestId('slide-1');
    expect(slide1).toHaveTextContent(/AI-Native LMS/i);
  });

  it('shows slide 2 describing the problem', () => {
    renderPage();
    const slide2 = screen.getByTestId('slide-2');
    expect(slide2).toHaveTextContent(/25%/i);
  });
});
