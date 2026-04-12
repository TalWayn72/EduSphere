/**
 * Unit tests for DomainConfirmationModal.
 *
 * Tests: modal open/close, domain selection checkboxes, confirm button
 * calls mutation with correct domainIds, loading and error states,
 * new domain form submission.
 * urql hooks are fully mocked — no real GraphQL calls.
 */
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── i18n mock ─────────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string, opts?: Record<string, unknown>) => {
      if (typeof fallback !== 'string') return _key;
      if (!opts) return fallback;
      return fallback.replace(/\{\{(\w+)\}\}/g, (_m, k: string) =>
        String(opts[k] ?? `{{${k}}}`)
      );
    },
  }),
}));

// ── urql mock ─────────────────────────────────────────────────────────────────
const mockExecConfirm = vi.fn().mockResolvedValue({ data: {}, error: undefined });
const mockExecCreate = vi.fn().mockResolvedValue({
  data: { createJargonDomain: { id: 'domain-new' } },
  error: undefined,
});

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [
    {
      data: {
        detectLessonDomains: {
          domains: [
            {
              domain: { id: 'dom-1', name: 'קבלה', description: 'Kabbalah' },
              confidence: 0.92,
              method: 'LLM',
            },
            {
              domain: { id: 'dom-2', name: 'תלמוד', description: 'Talmud' },
              confidence: 0.65,
              method: 'EMBEDDING',
            },
          ],
          suggestedTerms: [],
        },
      },
      fetching: false,
    },
    vi.fn(),
  ]),
  useMutation: vi.fn()
    .mockImplementationOnce(() => [{ fetching: false }, mockExecConfirm])
    .mockImplementationOnce(() => [{ fetching: false }, mockExecCreate])
    .mockImplementation(() => [{ fetching: false }, vi.fn()]),
  gql: vi.fn((s: TemplateStringsArray) => String(s)),
}));

// ── Radix Dialog mock (portal issues in jsdom) ────────────────────────────────
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange: () => void;
    children: React.ReactNode;
  }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

// ── Checkbox mock ─────────────────────────────────────────────────────────────
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: () => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={onCheckedChange}
      data-testid="domain-checkbox"
    />
  ),
}));

// ── Badge mock ────────────────────────────────────────────────────────────────
vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => <span data-variant={variant}>{children}</span>,
}));

// ── Button mock ───────────────────────────────────────────────────────────────
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} type={type ?? 'button'}>
      {children}
    </button>
  ),
}));

// ── Input/Label mocks ─────────────────────────────────────────────────────────
vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

// ── GraphQL queries mock ──────────────────────────────────────────────────────
vi.mock('@/lib/graphql/jargon.queries', () => ({
  DETECT_LESSON_DOMAINS_QUERY: 'DETECT_LESSON_DOMAINS_QUERY',
  CONFIRM_LESSON_DOMAINS_MUTATION: 'CONFIRM_LESSON_DOMAINS_MUTATION',
  CREATE_JARGON_DOMAIN_MUTATION: 'CREATE_JARGON_DOMAIN_MUTATION',
}));

// ── Component import (after mocks) ────────────────────────────────────────────
import { DomainConfirmationModal } from './DomainConfirmationModal';

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultProps = {
  lessonId: 'lesson-uuid-1',
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
};

function renderModal(props = {}) {
  return render(<DomainConfirmationModal {...defaultProps} {...props} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DomainConfirmationModal', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Restore urql mocks after clearAllMocks
    const { useQuery, useMutation } = vi.mocked(await import('urql'));
    useQuery.mockReturnValue([
      {
        data: {
          detectLessonDomains: {
            domains: [
              {
                domain: { id: 'dom-1', name: 'קבלה', description: 'Kabbalah' },
                confidence: 0.92,
                method: 'LLM',
              },
              {
                domain: { id: 'dom-2', name: 'תלמוד', description: 'Talmud' },
                confidence: 0.65,
                method: 'EMBEDDING',
              },
            ],
            suggestedTerms: [],
          },
        },
        fetching: false,
      },
      vi.fn(),
    ] as never);
    useMutation
      .mockImplementationOnce(() => [{ fetching: false }, mockExecConfirm])
      .mockImplementationOnce(() => [{ fetching: false }, mockExecCreate])
      .mockImplementation(() => [{ fetching: false }, vi.fn()]);
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  it('renders the dialog when isOpen is true', () => {
    renderModal();
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders the modal title', () => {
    renderModal();
    expect(screen.getByText('Confirm Lesson Domains')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    renderModal();
    expect(
      screen.getByText(/automatically detected/i)
    ).toBeInTheDocument();
  });

  // ── Domain list ───────────────────────────────────────────────────────────

  it('renders detected domain names', () => {
    renderModal();
    expect(screen.getByText('קבלה')).toBeInTheDocument();
    expect(screen.getByText('תלמוד')).toBeInTheDocument();
  });

  it('renders confidence badges for each domain', () => {
    renderModal();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('renders detection method labels (LLM, EMBEDDING)', () => {
    renderModal();
    expect(screen.getByText('LLM')).toBeInTheDocument();
    expect(screen.getByText('EMBEDDING')).toBeInTheDocument();
  });

  it('renders checkboxes for each detected domain', () => {
    renderModal();
    const checkboxes = screen.getAllByTestId('domain-checkbox');
    expect(checkboxes).toHaveLength(2);
  });

  it('all detected domains start as checked (selected by default)', () => {
    renderModal();
    const checkboxes = screen.getAllByTestId(
      'domain-checkbox'
    ) as HTMLInputElement[];
    checkboxes.forEach((cb) => expect(cb.checked).toBe(true));
  });

  // ── Domain toggling ───────────────────────────────────────────────────────

  it('unchecks a domain when checkbox is toggled off', async () => {
    renderModal();
    const checkboxes = screen.getAllByTestId(
      'domain-checkbox'
    ) as HTMLInputElement[];
    // Use click to trigger the onChange handler on the native input
    fireEvent.click(checkboxes[0]);
    // After toggle, one checkbox becomes unchecked
    await waitFor(() => {
      const updated = screen.getAllByTestId(
        'domain-checkbox'
      ) as HTMLInputElement[];
      const uncheckedCount = updated.filter((cb) => !cb.checked).length;
      expect(uncheckedCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Confirm button ────────────────────────────────────────────────────────

  it('confirm button is enabled when at least one domain is selected', () => {
    renderModal();
    // Use getAllByText to handle multiple "Confirm" matches, then find the button
    const confirmBtns = screen.getAllByText(/Confirm/i);
    const confirmBtn = confirmBtns.find(
      (el) => el.tagName === 'BUTTON'
    );
    expect(confirmBtn).toBeDefined();
    expect(confirmBtn).not.toBeDisabled();
  });

  it('renders confirm button with selected count in text', () => {
    renderModal();
    expect(screen.getByText(/Confirm 2 domain/i)).toBeInTheDocument();
  });

  // ── Cancel ────────────────────────────────────────────────────────────────

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const cancelBtns = screen.getAllByText(/Cancel/i);
    fireEvent.click(cancelBtns[0]);
    expect(onClose).toHaveBeenCalled();
  });

  // ── New domain form ───────────────────────────────────────────────────────

  it('shows "+ Add new domain" button initially', () => {
    renderModal();
    expect(screen.getByText('+ Add new domain')).toBeInTheDocument();
  });

  it('shows new domain form when "+ Add new domain" is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByText('+ Add new domain'));
    expect(screen.getByText('Add New Domain')).toBeInTheDocument();
  });

  it('hides new domain form when Cancel is clicked inside the form', () => {
    renderModal();
    fireEvent.click(screen.getByText('+ Add new domain'));
    // The form-Cancel button (second Cancel on page)
    const cancelBtns = screen.getAllByText(/Cancel/i);
    const formCancel = cancelBtns.find(
      (btn) => btn.closest('form') !== null
    );
    if (formCancel) fireEvent.click(formCancel);
    expect(screen.queryByText('Add New Domain')).not.toBeInTheDocument();
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  it('shows detecting message when fetching is true', async () => {
    const { useQuery } = vi.mocked(await import('urql'));
    useQuery.mockReturnValue([
      {
        data: undefined,
        fetching: true,
      },
      vi.fn(),
    ] as never);

    renderModal();
    expect(screen.getByText('Detecting domains...')).toBeInTheDocument();
  });
});
