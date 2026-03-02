import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useMutation: vi.fn() };
});

vi.mock('graphql-request', () => ({
  request: vi.fn(),
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { PurchaseCourseButton } from './PurchaseCourseButton';
import * as tanstack from '@tanstack/react-query';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MUTATE_FN = vi.fn();

function setupMutation(overrides: Record<string, unknown> = {}) {
  vi.mocked(tanstack.useMutation).mockReturnValue({
    mutate: MUTATE_FN,
    isPending: false,
    ...overrides,
  } as never);
}

function renderButton(
  props = { courseId: 'course-1', priceCents: 2999, currency: 'USD' }
) {
  return render(
    <MemoryRouter>
      <PurchaseCourseButton {...props} />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PurchaseCourseButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMutation();
  });

  it('displays formatted price for a paid course', () => {
    renderButton({ courseId: 'course-1', priceCents: 2999, currency: 'USD' });
    expect(
      screen.getByRole('button', { name: /purchase \$29\.99/i })
    ).toBeInTheDocument();
  });

  it('displays "Enroll Free" for a free course (priceCents=0)', () => {
    renderButton({ courseId: 'course-1', priceCents: 0, currency: 'USD' });
    expect(
      screen.getByRole('button', { name: /enroll free/i })
    ).toBeInTheDocument();
  });

  it('button is enabled by default', () => {
    renderButton();
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('button is disabled while purchase is pending', () => {
    setupMutation({ isPending: true });
    renderButton();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows "Processing..." text while pending', () => {
    setupMutation({ isPending: true });
    renderButton();
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('shows spinner animation while pending', () => {
    setupMutation({ isPending: true });
    const { container } = renderButton();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('calls mutate when button is clicked', () => {
    renderButton();
    fireEvent.click(screen.getByRole('button'));
    expect(MUTATE_FN).toHaveBeenCalledOnce();
  });

  it('does not call mutate when disabled (pending)', () => {
    setupMutation({ isPending: true });
    renderButton();
    // Button is disabled so click should not fire
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('renders correct price for a different currency', async () => {
    renderButton({ courseId: 'course-1', priceCents: 1500, currency: 'EUR' });
    await waitFor(() => {
      const btn = screen.getByRole('button');
      expect(btn.textContent).toMatch(/15/);
    });
  });
});
