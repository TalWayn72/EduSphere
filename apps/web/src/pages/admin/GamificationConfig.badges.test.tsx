import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockMutationExec = vi.fn().mockResolvedValue({ data: null });
vi.mock('urql', () => ({
  useMutation: vi.fn(() => [{}, mockMutationExec]),
}));

vi.mock('lucide-react', () => {
  const MockIcon = (props: Record<string, unknown>) => (
    <span data-testid="mock-icon" {...props} />
  );
  return { Pencil: MockIcon, Trash2: MockIcon };
});

vi.mock('./BadgeAutoAwardEditor', () => ({
  BadgeAutoAwardEditor: () => <div data-testid="auto-award-editor" />,
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import {
  GamificationBadgeForm,
  GamificationBadgeTable,
  type BadgeData,
} from './GamificationConfig.badges';

// ── Helpers ───────────────────────────────────────────────────────────────────

const t = (k: string) => k;

const sampleBadges: BadgeData[] = [
  {
    id: 'b1',
    name: 'First Steps',
    description: 'Complete first course',
    iconUrl: '',
    xpRequired: 100,
    autoAwardCriteria: null,
  },
  {
    id: 'b2',
    name: 'Scholar',
    description: 'Complete 10 courses',
    iconUrl: 'https://img.test/badge.png',
    xpRequired: 1000,
    autoAwardCriteria: {
      type: 'XP_THRESHOLD',
      amount: 1000,
    } as BadgeData['autoAwardCriteria'],
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GamificationBadgeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with name input', () => {
    render(<GamificationBadgeForm t={t} />);
    expect(screen.getByLabelText('gamification.badgeName')).toBeInTheDocument();
  });

  it('renders description and XP inputs', () => {
    render(<GamificationBadgeForm t={t} />);
    expect(
      screen.getByLabelText('gamification.badgeDescription')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('gamification.xpRequired')
    ).toBeInTheDocument();
  });

  it('renders icon URL input', () => {
    render(<GamificationBadgeForm t={t} />);
    expect(screen.getByLabelText('gamification.iconUrl')).toBeInTheDocument();
  });

  it('shows "Create" button in create mode', () => {
    render(<GamificationBadgeForm t={t} />);
    expect(screen.getByText('gamification.addBadge')).toBeInTheDocument();
  });

  it('shows "Update" button in edit mode', () => {
    render(<GamificationBadgeForm t={t} editingBadge={sampleBadges[0]} />);
    expect(screen.getByText('gamification.updateBadge')).toBeInTheDocument();
  });

  it('renders BadgeAutoAwardEditor', () => {
    render(<GamificationBadgeForm t={t} />);
    expect(screen.getByTestId('auto-award-editor')).toBeInTheDocument();
  });

  it('shows cancel button in edit mode', () => {
    const onCancel = vi.fn();
    render(
      <GamificationBadgeForm
        t={t}
        editingBadge={sampleBadges[0]}
        onCancel={onCancel}
      />
    );
    const cancelBtn = screen.getByText('common.cancel');
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('GamificationBadgeTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when badges list is empty', () => {
    const { container } = render(<GamificationBadgeTable badges={[]} t={t} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders badge names', () => {
    render(<GamificationBadgeTable badges={sampleBadges} t={t} />);
    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Scholar')).toBeInTheDocument();
  });

  it('renders XP requirements', () => {
    render(<GamificationBadgeTable badges={sampleBadges} t={t} />);
    expect(screen.getByText('100 XP')).toBeInTheDocument();
    expect(screen.getByText('1000 XP')).toBeInTheDocument();
  });

  it('renders descriptions', () => {
    render(<GamificationBadgeTable badges={sampleBadges} t={t} />);
    expect(screen.getByText('Complete first course')).toBeInTheDocument();
    expect(screen.getByText('Complete 10 courses')).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    render(
      <GamificationBadgeTable badges={sampleBadges} t={t} onEdit={onEdit} />
    );
    const editButtons = screen.getAllByLabelText('common.edit');
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(sampleBadges[0]);
  });

  it('renders table headers', () => {
    render(<GamificationBadgeTable badges={sampleBadges} t={t} />);
    expect(screen.getByText('gamification.colName')).toBeInTheDocument();
    expect(screen.getByText('gamification.colXp')).toBeInTheDocument();
  });

  it('shows auto-award criteria type', () => {
    render(<GamificationBadgeTable badges={sampleBadges} t={t} />);
    expect(screen.getByText('XP_THRESHOLD')).toBeInTheDocument();
  });
});
