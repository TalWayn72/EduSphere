import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PartnerSignupPage } from './PartnerSignupPage';

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof import('urql')>();
  return {
    ...actual,
    useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <PartnerSignupPage />
    </MemoryRouter>
  );
}

describe('PartnerSignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /become an edusphere partner/i })).toBeInTheDocument();
  });

  it('renders page wrapper with data-testid', () => {
    renderPage();
    expect(screen.getByTestId('partner-signup-page')).toBeInTheDocument();
  });

  it('shows revenue share info card', () => {
    renderPage();
    expect(screen.getByText(/30% Revenue Share/i)).toBeInTheDocument();
    expect(screen.getByText(/70% goes to you as a partner/i)).toBeInTheDocument();
  });

  it('shows all 4 partner type options in descriptions', () => {
    renderPage();
    expect(screen.getByText(/Deliver corporate training on white-label EduSphere/i)).toBeInTheDocument();
    expect(screen.getByText(/Publish courses in EduSphere marketplace/i)).toBeInTheDocument();
    expect(screen.getByText(/Sell EduSphere to institutions/i)).toBeInTheDocument();
    expect(screen.getByText(/Deploy & customize EduSphere for enterprise clients/i)).toBeInTheDocument();
  });

  it('submit button is disabled when form is empty', () => {
    renderPage();
    const btn = screen.getByTestId('partner-submit-btn');
    expect(btn).toBeDisabled();
  });

  it('shows loading text on submit button when fetching', async () => {
    const { useMutation } = await import('urql');
    vi.mocked(useMutation).mockReturnValue([
      { fetching: true, error: undefined, data: undefined, stale: false, operation: undefined as never },
      vi.fn(),
    ]);
    renderPage();
    expect(screen.getByTestId('partner-submit-btn')).toHaveTextContent(/submitting/i);
  });

  it('does not show success message initially', () => {
    renderPage();
    expect(screen.queryByTestId('partner-success-message')).not.toBeInTheDocument();
  });

  it('does not show error message when no error', () => {
    renderPage();
    expect(screen.queryByTestId('partner-error-message')).not.toBeInTheDocument();
  });

  it('shows error message when mutation returns error', async () => {
    const { useMutation } = await import('urql');
    vi.mocked(useMutation).mockReturnValue([
      { fetching: false, error: { message: 'Server error' } as never, data: undefined, stale: false, operation: undefined as never },
      vi.fn(),
    ]);
    renderPage();
    expect(screen.getByTestId('partner-error-message')).toBeInTheDocument();
  });

  it('shows success message after successful mutation', async () => {
    const { useMutation } = await import('urql');
    const mockExecute = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(useMutation).mockReturnValue([
      { fetching: false, error: undefined, data: undefined, stale: false, operation: undefined as never },
      mockExecute,
    ]);
    renderPage();

    fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: 'Test Corp' } });
    fireEvent.change(screen.getByLabelText(/contact name/i), { target: { value: 'Jane Smith' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/expected learners/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/describe your use case/i), { target: { value: 'We plan to use EduSphere for all our corporate training needs.' } });

    await waitFor(() => {
      expect(screen.queryByTestId('partner-success-message')).not.toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email', async () => {
    renderPage();
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.blur(emailInput);
    await waitFor(() => {
      const alerts = screen.queryAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});
