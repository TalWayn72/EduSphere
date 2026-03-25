import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange }: { id: string; checked: boolean; onCheckedChange: () => void }) => (
    <input type="checkbox" id={id} checked={checked} onChange={onCheckedChange} data-testid={`checkbox-${id}`} />
  ),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { WebhookForm } from './WebhooksPage.form';

// ── Tests ─────────────────────────────────────────────────────────────────────

const t = (k: string) => k;

describe('WebhookForm', () => {
  it('renders URL input', () => {
    render(<WebhookForm t={t} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('webhooks.urlLabel')).toBeInTheDocument();
  });

  it('renders create button', () => {
    render(<WebhookForm t={t} onSubmit={vi.fn()} />);
    expect(screen.getByText('webhooks.create')).toBeInTheDocument();
  });

  it('renders event checkboxes', () => {
    render(<WebhookForm t={t} onSubmit={vi.fn()} />);
    expect(screen.getByText('user.created')).toBeInTheDocument();
    expect(screen.getByText('course.completed')).toBeInTheDocument();
    expect(screen.getByText('badge.earned')).toBeInTheDocument();
  });

  it('renders events legend', () => {
    render(<WebhookForm t={t} onSubmit={vi.fn()} />);
    expect(screen.getByText('webhooks.eventsLabel')).toBeInTheDocument();
  });

  it('renders 6 event checkboxes', () => {
    render(<WebhookForm t={t} onSubmit={vi.fn()} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(6);
  });
});
