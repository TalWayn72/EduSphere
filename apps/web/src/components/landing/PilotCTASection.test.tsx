import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'urql';
import { never } from 'wonka';
import { PilotCTASection } from './PilotCTASection';

// Minimal urql mock client that never resolves mutations (we test form state only)
const mockClient = {
  executeQuery: () => never,
  executeMutation: () => never,
  executeSubscription: () => never,
} as unknown as Parameters<typeof Provider>[0]['value'];

function renderWithUrql(ui: React.ReactElement) {
  return render(<Provider value={mockClient}>{ui}</Provider>);
}

describe('PilotCTASection', () => {
  it('renders the section heading', () => {
    renderWithUrql(<PilotCTASection />);
    expect(screen.getByText(/Ready to Transform Your Learning Experience/i)).toBeInTheDocument();
  });

  it('renders required form fields', () => {
    renderWithUrql(<PilotCTASection />);
    expect(screen.getByLabelText(/Organization Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estimated Users/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Use Case/i)).toBeInTheDocument();
  });

  it('shows validation error when email is invalid', async () => {
    const user = userEvent.setup();
    renderWithUrql(<PilotCTASection />);
    await user.type(screen.getByLabelText(/Email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /Apply for Free Pilot/i }));
    expect(await screen.findByText(/Valid email required/i)).toBeInTheDocument();
  });

  it('shows validation error when organization name is empty', async () => {
    const user = userEvent.setup();
    renderWithUrql(<PilotCTASection />);
    await user.click(screen.getByRole('button', { name: /Apply for Free Pilot/i }));
    expect(await screen.findByText(/Organization name is required/i)).toBeInTheDocument();
  });

  it('renders all 5 benefit items', () => {
    renderWithUrql(<PilotCTASection />);
    expect(screen.getByText(/90 days free/i)).toBeInTheDocument();
    expect(screen.getByText(/Full feature access/i)).toBeInTheDocument();
    expect(screen.getByText(/Dedicated onboarding specialist/i)).toBeInTheDocument();
    expect(screen.getByText(/Data migration assistance/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom white-label domain/i)).toBeInTheDocument();
  });
});
