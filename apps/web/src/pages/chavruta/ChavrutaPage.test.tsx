import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import * as useChavrutaDebateModule from '@/hooks/useChavrutaDebate';
import { ChavrutaPage } from './ChavrutaPage';

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/chavruta/DebateInterface', () => ({
  DebateInterface: vi.fn(
    ({
      topic,
      isLoading,
    }: {
      topic: string | undefined;
      isLoading: boolean;
    }) => (
      <div data-testid="debate-interface" data-topic={topic ?? ''}>
        {isLoading ? 'Debate loading...' : 'Debate ready'}
      </div>
    )
  ),
}));

vi.mock('@/hooks/useChavrutaDebate', () => ({
  useChavrutaDebate: vi.fn(),
}));

const mockStartNewTopic = vi.fn();
const mockGrantConsent = vi.fn();
const mockSubmitArgument = vi.fn();

const defaultDebateState = {
  messages: [{ id: 'm1', role: 'user', content: 'Hello' }],
  topic: 'Is AI conscious?',
  isLoading: false,
  error: null,
  needsConsent: false,
  grantConsent: mockGrantConsent,
  submitArgument: mockSubmitArgument,
  startNewTopic: mockStartNewTopic,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useChavrutaDebateModule.useChavrutaDebate).mockReturnValue(
    defaultDebateState as never
  );
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ChavrutaPage />
    </MemoryRouter>
  );
}

describe('ChavrutaPage', () => {
  it('renders "Chavruta Debate" heading', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: /chavruta debate/i })
    ).toBeInTheDocument();
  });

  it('shows the AI disclosure badge', () => {
    renderPage();
    expect(
      screen.getByText(/generated with ai assistance/i)
    ).toBeInTheDocument();
  });

  it('renders the "New Topic" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /start a new debate topic/i })
    ).toBeInTheDocument();
  });

  it('calls startNewTopic when "New Topic" is clicked', () => {
    renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: /start a new debate topic/i })
    );
    expect(mockStartNewTopic).toHaveBeenCalledTimes(1);
  });

  it('"New Topic" button is disabled when isLoading=true', () => {
    vi.mocked(useChavrutaDebateModule.useChavrutaDebate).mockReturnValue({
      ...defaultDebateState,
      isLoading: true,
    } as never);
    renderPage();
    expect(
      screen.getByRole('button', { name: /start a new debate topic/i })
    ).toBeDisabled();
  });

  it('shows ConsentPrompt when needsConsent=true', () => {
    vi.mocked(useChavrutaDebateModule.useChavrutaDebate).mockReturnValue({
      ...defaultDebateState,
      needsConsent: true,
    } as never);
    renderPage();
    expect(
      screen.getByText(/ai processing consent required/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /i consent/i })
    ).toBeInTheDocument();
  });

  it('calls grantConsent when consent button is clicked', () => {
    vi.mocked(useChavrutaDebateModule.useChavrutaDebate).mockReturnValue({
      ...defaultDebateState,
      needsConsent: true,
    } as never);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /i consent/i }));
    expect(mockGrantConsent).toHaveBeenCalledTimes(1);
  });

  it('shows loading skeleton when isLoading=true and no messages', () => {
    vi.mocked(useChavrutaDebateModule.useChavrutaDebate).mockReturnValue({
      ...defaultDebateState,
      isLoading: true,
      messages: [],
    } as never);
    renderPage();
    expect(
      screen.getByRole('generic', { name: /loading debate/i })
    ).toBeInTheDocument();
  });

  it('renders DebateInterface when consent given and not in consent state', () => {
    renderPage();
    expect(screen.getByTestId('debate-interface')).toBeInTheDocument();
  });

  it('shows error banner when error is present', () => {
    vi.mocked(useChavrutaDebateModule.useChavrutaDebate).mockReturnValue({
      ...defaultDebateState,
      error: 'AI service unavailable',
    } as never);
    renderPage();
    expect(screen.getByText('AI service unavailable')).toBeInTheDocument();
  });
});
