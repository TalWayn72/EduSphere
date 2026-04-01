import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchPanel } from './MatchPanel';
import type { MatchState } from './collaboration.types';

// ── shadcn mocks ──────────────────────────────────────────────────────────────
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="card" {...props}>
      {children}
    </div>
  ),
  CardContent: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="card-content" {...props}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

// ── helpers ───────────────────────────────────────────────────────────────────
const defaultProps = {
  matchState: 'idle' as MatchState,
  matchMode: 'human' as const,
  isCreating: false,
  onStartMatching: vi.fn(),
  onCreateChavruta: vi.fn(),
};

function renderPanel(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<MatchPanel {...props} />);
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe('MatchPanel — idle state', () => {
  it('renders both human and AI sections', () => {
    renderPanel();
    expect(screen.getByText('humanChavruta')).toBeTruthy();
    expect(screen.getByText('aiChavruta')).toBeTruthy();
  });

  it('renders descriptions for both modes', () => {
    renderPanel();
    expect(screen.getByText('humanChavrutaDescription')).toBeTruthy();
    expect(screen.getByText('aiChavrutaDescription')).toBeTruthy();
  });

  it('shows findPartner button for human mode when idle', () => {
    renderPanel({ matchState: 'idle', matchMode: 'human' });
    expect(screen.getByText('findPartner')).toBeTruthy();
  });

  it('shows startAiChavruta button for AI mode when idle', () => {
    renderPanel({ matchState: 'idle', matchMode: 'ai' });
    expect(screen.getByText('startAiChavruta')).toBeTruthy();
  });
});

describe('MatchPanel — user interactions', () => {
  it('calls onStartMatching("human") when Find Partner clicked', () => {
    const onStartMatching = vi.fn();
    renderPanel({ matchState: 'idle', matchMode: 'ai', onStartMatching });
    fireEvent.click(screen.getByText('findPartner'));
    expect(onStartMatching).toHaveBeenCalledWith('human');
  });

  it('calls onStartMatching("ai") when Start AI Chavruta clicked', () => {
    const onStartMatching = vi.fn();
    renderPanel({ matchState: 'idle', matchMode: 'human', onStartMatching });
    fireEvent.click(screen.getByText('startAiChavruta'));
    expect(onStartMatching).toHaveBeenCalledWith('ai');
  });
});

describe('MatchPanel — searching state', () => {
  it('shows searching indicator for human mode', () => {
    renderPanel({ matchState: 'searching', matchMode: 'human' });
    expect(screen.getByText('searchingPartner')).toBeTruthy();
  });

  it('disables human searching button', () => {
    renderPanel({ matchState: 'searching', matchMode: 'human' });
    const btn = screen.getByText('searchingPartner').closest('button');
    expect(btn?.disabled).toBe(true);
  });

  it('shows connecting indicator for AI mode', () => {
    renderPanel({ matchState: 'searching', matchMode: 'ai' });
    expect(screen.getByText('connectingAi')).toBeTruthy();
  });

  it('disables AI connecting button', () => {
    renderPanel({ matchState: 'searching', matchMode: 'ai' });
    const btn = screen.getByText('connectingAi').closest('button');
    expect(btn?.disabled).toBe(true);
  });
});

describe('MatchPanel — found state', () => {
  it('shows partnerFound for human match', () => {
    renderPanel({ matchState: 'found', matchMode: 'human' });
    expect(screen.getByText('partnerFound')).toBeTruthy();
  });

  it('calls onCreateChavruta when partner found button clicked', () => {
    const onCreateChavruta = vi.fn();
    renderPanel({ matchState: 'found', matchMode: 'human', onCreateChavruta });
    fireEvent.click(screen.getByText('partnerFound'));
    expect(onCreateChavruta).toHaveBeenCalledTimes(1);
  });

  it('shows creatingSession when isCreating is true', () => {
    renderPanel({ matchState: 'found', matchMode: 'human', isCreating: true });
    expect(screen.getByText('creatingSession')).toBeTruthy();
  });

  it('disables partner found button when isCreating', () => {
    renderPanel({ matchState: 'found', matchMode: 'human', isCreating: true });
    const btn = screen.getByText('creatingSession').closest('button');
    expect(btn?.disabled).toBe(true);
  });

  it('shows openingSession for AI match', () => {
    renderPanel({ matchState: 'found', matchMode: 'ai' });
    expect(screen.getByText('openingSession')).toBeTruthy();
  });
});

describe('MatchPanel — always available indicator', () => {
  it('shows always available text in AI section', () => {
    renderPanel();
    expect(screen.getByText('alwaysAvailable')).toBeTruthy();
  });
});
