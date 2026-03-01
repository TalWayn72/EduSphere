import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AccessibilityStatementPage } from './AccessibilityStatementPage';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <AccessibilityStatementPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AccessibilityStatementPage', () => {
  it('renders the "Accessibility Statement" heading', () => {
    renderPage();
    expect(screen.getByText('Accessibility Statement')).toBeInTheDocument();
  });

  it('renders the WCAG 2.2 conformance badge', () => {
    renderPage();
    expect(
      screen.getByText('WCAG 2.2 Level AA — Partial Conformance')
    ).toBeInTheDocument();
  });

  it('renders the "Conformance Status" card', () => {
    renderPage();
    expect(screen.getByText('Conformance Status')).toBeInTheDocument();
  });

  it('renders the "Accessibility Features" card', () => {
    renderPage();
    expect(screen.getByText('Accessibility Features')).toBeInTheDocument();
  });

  it('renders the "Known Limitations" card', () => {
    renderPage();
    expect(screen.getByText('Known Limitations')).toBeInTheDocument();
  });

  it('renders the "Feedback and Contact" card', () => {
    renderPage();
    expect(screen.getByText('Feedback and Contact')).toBeInTheDocument();
  });

  it('renders the "Technical Approach" card', () => {
    renderPage();
    expect(screen.getByText('Technical Approach')).toBeInTheDocument();
  });

  it('shows at least one WCAG criterion from the features list', () => {
    renderPage();
    // SC 4.1.2 is one of the feature items
    expect(screen.getByText('SC 4.1.2')).toBeInTheDocument();
  });

  it('shows a known limitation area (Live session captions)', () => {
    renderPage();
    expect(screen.getByText('Live session captions')).toBeInTheDocument();
  });

  it('renders the "Return to home" link', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /return to home/i })).toBeInTheDocument();
  });

  it('renders the accessibility email contact link', () => {
    renderPage();
    expect(
      screen.getByRole('link', { name: /accessibility@edusphere\.io/i })
    ).toBeInTheDocument();
  });

  it('shows the partial conformance description', () => {
    renderPage();
    expect(screen.getByText(/partially conforms/i)).toBeInTheDocument();
  });

  it('shows the "Last updated" date', () => {
    renderPage();
    expect(screen.getByText(/last updated.*february 2026/i)).toBeInTheDocument();
  });
});
