import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as urql from 'urql';
import { WhatsAppSetupPage } from './WhatsAppSetupPage';

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => {
    if (name === '__esModule') return true;
    return function MockIcon(props: Record<string, unknown>) {
      return <span data-testid={`icon-${String(name)}`} {...props} />;
    };
  },
}));

vi.mock('urql', async () => {
  const actual = await vi.importActual('urql');
  return { ...actual, useMutation: vi.fn() };
});

function setup(registerSuccess = true) {
  const registerFn = vi.fn().mockResolvedValue({
    data: { registerWhatsApp: { success: registerSuccess } },
  });
  const verifyFn = vi.fn().mockResolvedValue({
    data: { verifyWhatsApp: { success: true } },
  });
  let callCount = 0;
  vi.mocked(urql.useMutation).mockImplementation(() => {
    callCount++;
    const fn = callCount <= 1 ? registerFn : verifyFn;
    return [{ fetching: false, stale: false, error: undefined }, fn] as never;
  });
  return { registerFn, verifyFn };
}

describe('WhatsAppSetupPage', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('renders page title', () => {
    setup();
    render(<WhatsAppSetupPage />);
    expect(screen.getByText('WhatsApp Setup')).toBeInTheDocument();
  });

  it('renders registration form initially', () => {
    setup();
    render(<WhatsAppSetupPage />);
    expect(screen.getByLabelText(/country code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/whatsapp consent/i)).toBeInTheDocument();
  });

  it('submit is disabled without consent', () => {
    setup();
    render(<WhatsAppSetupPage />);
    const submitBtn = screen.getByRole('button', { name: /send verification/i });
    expect(submitBtn).toBeDisabled();
  });

  it('submit is disabled without phone number', () => {
    setup();
    render(<WhatsAppSetupPage />);
    fireEvent.click(screen.getByLabelText(/whatsapp consent/i));
    const submitBtn = screen.getByRole('button', { name: /send verification/i });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit when consent and phone are provided', () => {
    setup();
    render(<WhatsAppSetupPage />);
    fireEvent.click(screen.getByLabelText(/whatsapp consent/i));
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '5551234' } });
    const submitBtn = screen.getByRole('button', { name: /send verification/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it('moves to verification step on successful register', async () => {
    const { registerFn } = setup(true);
    render(<WhatsAppSetupPage />);
    fireEvent.click(screen.getByLabelText(/whatsapp consent/i));
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '5551234' } });
    fireEvent.click(screen.getByRole('button', { name: /send verification/i }));
    await waitFor(() => {
      expect(registerFn).toHaveBeenCalled();
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    });
  });

  it('verify button is disabled without 6-digit code', async () => {
    setup(true);
    render(<WhatsAppSetupPage />);
    fireEvent.click(screen.getByLabelText(/whatsapp consent/i));
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '5551234' } });
    fireEvent.click(screen.getByRole('button', { name: /send verification/i }));
    await waitFor(() => screen.getByLabelText(/verification code/i));
    expect(screen.getByRole('button', { name: /^verify$/i })).toBeDisabled();
  });

  it('renders resend code link in verification step', async () => {
    setup(true);
    render(<WhatsAppSetupPage />);
    fireEvent.click(screen.getByLabelText(/whatsapp consent/i));
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '5551234' } });
    fireEvent.click(screen.getByRole('button', { name: /send verification/i }));
    await waitFor(() => expect(screen.getByText(/resend code/i)).toBeInTheDocument());
  });

  it('has accessible form labels', () => {
    setup();
    render(<WhatsAppSetupPage />);
    expect(screen.getByRole('form', { name: /whatsapp registration/i })).toBeInTheDocument();
  });
});
