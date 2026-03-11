import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PilotSignupPage } from './PilotSignupPage';

vi.mock('urql', async () => {
  const actual = await vi.importActual<typeof import('urql')>('urql');
  return {
    ...actual,
    useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <PilotSignupPage />
    </MemoryRouter>
  );
}

describe('PilotSignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pilot-signup-page test id', () => {
    renderPage();
    expect(screen.getByTestId('pilot-signup-page')).toBeInTheDocument();
  });

  it('renders the form with pilot-form test id', () => {
    renderPage();
    expect(screen.getByTestId('pilot-form')).toBeInTheDocument();
  });

  it('renders Organization Name field', () => {
    renderPage();
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
  });

  it('renders Contact Name field', () => {
    renderPage();
    expect(screen.getByLabelText(/contact name/i)).toBeInTheDocument();
  });

  it('renders Email field', () => {
    renderPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders Estimated Users field', () => {
    renderPage();
    expect(screen.getByLabelText(/estimated users/i)).toBeInTheDocument();
  });

  it('renders Use Case textarea', () => {
    renderPage();
    expect(screen.getByLabelText(/use case/i)).toBeInTheDocument();
  });

  it('submit button shows "Submit" text in idle state', () => {
    renderPage();
    expect(screen.getByTestId('pilot-submit-btn')).toHaveTextContent(/submit/i);
  });

  it('shows loading state when fetching is true', async () => {
    const { useMutation } = await import('urql');
    vi.mocked(useMutation).mockReturnValue([{ fetching: true, error: undefined, data: undefined, stale: false, operation: undefined as never }, vi.fn()]);
    renderPage();
    expect(screen.getByTestId('pilot-submit-btn')).toHaveTextContent(/submitting/i);
    expect(screen.getByTestId('pilot-submit-btn')).toBeDisabled();
  });

  it('does not show success message initially', () => {
    renderPage();
    expect(screen.queryByTestId('pilot-success-message')).not.toBeInTheDocument();
  });

  it('does not show error message when no error', () => {
    renderPage();
    expect(screen.queryByTestId('pilot-error-message')).not.toBeInTheDocument();
  });
});
