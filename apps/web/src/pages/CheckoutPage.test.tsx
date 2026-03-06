import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ── Stripe mock ───────────────────────────────────────────────────────────────
// Mock before any import that might trigger loadStripe
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue(null),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-elements">{children}</div>
  ),
  PaymentElement: () => <div data-testid="stripe-payment-element" />,
  useStripe: vi.fn(() => null),
  useElements: vi.fn(() => null),
}));

// ── Layout + router mocks ─────────────────────────────────────────────────────
vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => <button {...props}>{children}</button>,
}));

import { CheckoutPage } from './CheckoutPage';

// ── Helper ────────────────────────────────────────────────────────────────────
function renderWithParams(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/checkout${search}`]}>
      <Routes>
        <Route path="/checkout" element={<CheckoutPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Payment Unavailable" when VITE_STRIPE_PUBLISHABLE_KEY is not set', () => {
    // env var is not set in test env → stripePromise is null
    renderWithParams('?secret=cs_test_abc&session=pi_123&course=course-1');

    expect(screen.getByText('Payment Unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(/online payments are not configured/i)
    ).toBeInTheDocument();
  });

  it('does NOT render the checkout form when Stripe is not configured', () => {
    renderWithParams('?secret=cs_test_abc&session=pi_123&course=course-1');
    expect(screen.queryByTestId('checkout-form')).not.toBeInTheDocument();
  });

  it('shows "No Payment Session" when clientSecret param is missing', () => {
    // Even with a session param, secret is required
    renderWithParams('?session=pi_123&course=course-1');
    expect(screen.getByText('No Payment Session')).toBeInTheDocument();
    expect(
      screen.getByText(/select a course to purchase/i)
    ).toBeInTheDocument();
  });

  it('renders inside Layout wrapper', () => {
    renderWithParams('');
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('does not expose raw clientSecret in rendered DOM text', () => {
    const secret = 'pi_3abc_secret_xyz';
    renderWithParams(`?secret=${secret}&session=pi_abc&course=c-1`);
    // The secret should never be shown to the user in plain text
    expect(document.body.textContent).not.toContain(secret);
  });

  it('does not render raw error class names or stack traces in fallback state', () => {
    renderWithParams('');
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).not.toMatch(/TypeError|Error:/);
    expect(bodyText).not.toMatch(/at\s+\w+\s*\(/);
  });
});

// ── PurchaseCourseButton route regression ─────────────────────────────────────
// Verifies the /checkout route exists in the test router setup
describe('CheckoutPage — route registration', () => {
  it('/checkout route renders CheckoutPage (not a 404)', () => {
    renderWithParams('');
    // Page renders something (not "Page not found")
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('does not render "No Payment Session" when secret param is present (Stripe unconfigured path)', () => {
    renderWithParams('?secret=cs_test_abc&session=pi_123&course=c-1');
    // Without Stripe key it shows "Payment Unavailable", NOT "No Payment Session"
    expect(screen.queryByText('No Payment Session')).not.toBeInTheDocument();
    expect(screen.getByText('Payment Unavailable')).toBeInTheDocument();
  });
});
