/**
 * Unit tests for JargonTermForm.
 *
 * Tests: form validation (canonicalForm required, definitionShort required),
 * alt_forms tag input (add via Enter/comma/button, remove via X, no duplicates),
 * save button calls ADD mutation, loading state.
 * urql mutations are fully mocked.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── i18n mock ─────────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string, _opts?: object) =>
      typeof fallback === 'string' ? fallback : _key,
  }),
}));

// ── urql mock ─────────────────────────────────────────────────────────────────
const mockExecAdd = vi.fn().mockResolvedValue({ data: {}, error: undefined });

vi.mock('urql', () => ({
  useMutation: vi.fn().mockImplementation(() => {
    return [{ fetching: false }, mockExecAdd];
  }),
  gql: vi.fn((s: TemplateStringsArray) => String(s)),
}));

// ── UI component mocks ────────────────────────────────────────────────────────
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
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button onClick={onClick} disabled={disabled} type={type ?? 'button'}>
      {children}
    </button>
  ),
}));

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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => (
    <span data-testid="alt-form-badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">x</span>,
}));

// ── GraphQL queries mock ──────────────────────────────────────────────────────
vi.mock('@/lib/graphql/jargon.queries', () => ({
  ADD_JARGON_TERM_MUTATION: 'ADD_JARGON_TERM_MUTATION',
}));

// ── Component import (after mocks) ────────────────────────────────────────────
import { JargonTermForm } from './JargonTermForm';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const defaultProps = {
  domainId: 'domain-kabbalah',
  onSave: vi.fn(),
  onCancel: vi.fn(),
};

function renderForm(props = {}) {
  return render(<JargonTermForm {...defaultProps} {...props} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('JargonTermForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  it('renders the Canonical Form field', () => {
    renderForm();
    expect(screen.getByLabelText(/Canonical Form/i)).toBeInTheDocument();
  });

  it('renders the Phonetic Hint field', () => {
    renderForm();
    expect(screen.getByLabelText(/Phonetic Hint/i)).toBeInTheDocument();
  });

  it('renders the Short Definition textarea', () => {
    renderForm();
    expect(screen.getByLabelText(/Short Definition/i)).toBeInTheDocument();
  });

  it('renders the Language field', () => {
    renderForm();
    expect(screen.getByLabelText(/Language/i)).toBeInTheDocument();
  });

  it('renders Save Term and Cancel buttons', () => {
    renderForm();
    expect(screen.getByText('Save Term')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('shows validation error when canonicalForm is empty and form is submitted', async () => {
    renderForm();
    fireEvent.click(screen.getByText('Save Term'));
    await waitFor(() => {
      expect(
        screen.getByText('Canonical form is required')
      ).toBeInTheDocument();
    });
  });

  it('shows validation error when definitionShort is empty', async () => {
    renderForm();
    const canonicalInput = screen.getByLabelText(/Canonical Form/i);
    fireEvent.change(canonicalInput, { target: { value: 'ספירות' } });
    fireEvent.click(screen.getByText('Save Term'));
    await waitFor(() => {
      expect(screen.getByText('Definition is required')).toBeInTheDocument();
    });
  });

  // ── alt_forms tag input ───────────────────────────────────────────────────

  it('adds an alt form when Enter key is pressed in the alt input', () => {
    renderForm();
    const altInput = screen.getByPlaceholderText(/Type and press Enter/i);
    fireEvent.change(altInput, { target: { value: 'sefirot' } });
    fireEvent.keyDown(altInput, { key: 'Enter' });

    const badges = screen.getAllByTestId('alt-form-badge');
    expect(badges.some((b) => b.textContent?.includes('sefirot'))).toBe(true);
  });

  it('adds an alt form when comma key is pressed', () => {
    renderForm();
    const altInput = screen.getByPlaceholderText(/Type and press Enter/i);
    fireEvent.change(altInput, { target: { value: 'ספירה' } });
    fireEvent.keyDown(altInput, { key: ',' });

    const badges = screen.getAllByTestId('alt-form-badge');
    expect(badges.some((b) => b.textContent?.includes('ספירה'))).toBe(true);
  });

  it('adds an alt form when Add button is clicked', () => {
    renderForm();
    const altInput = screen.getByPlaceholderText(/Type and press Enter/i);
    fireEvent.change(altInput, { target: { value: 'Sefirah' } });
    fireEvent.click(screen.getByText('Add'));

    const badges = screen.getAllByTestId('alt-form-badge');
    expect(badges.some((b) => b.textContent?.includes('Sefirah'))).toBe(true);
  });

  it('clears the alt input field after adding a form', () => {
    renderForm();
    const altInput = screen.getByPlaceholderText(
      /Type and press Enter/i
    ) as HTMLInputElement;
    fireEvent.change(altInput, { target: { value: 'test' } });
    fireEvent.keyDown(altInput, { key: 'Enter' });
    expect(altInput.value).toBe('');
  });

  it('does not add duplicate alt forms', () => {
    renderForm();
    const altInput = screen.getByPlaceholderText(/Type and press Enter/i);
    fireEvent.change(altInput, { target: { value: 'sefirot' } });
    fireEvent.keyDown(altInput, { key: 'Enter' });
    fireEvent.change(altInput, { target: { value: 'sefirot' } });
    fireEvent.keyDown(altInput, { key: 'Enter' });

    const badges = screen
      .getAllByTestId('alt-form-badge')
      .filter((b) => b.textContent?.includes('sefirot'));
    expect(badges).toHaveLength(1);
  });

  it('removes an alt form when X button is clicked', async () => {
    renderForm();
    const altInput = screen.getByPlaceholderText(/Type and press Enter/i);
    fireEvent.change(altInput, { target: { value: 'ספירה' } });
    fireEvent.keyDown(altInput, { key: 'Enter' });
    fireEvent.change(altInput, { target: { value: 'sefirot' } });
    fireEvent.keyDown(altInput, { key: 'Enter' });

    const removeButtons = screen.getAllByRole('button', {
      name: /Remove/i,
    });
    expect(removeButtons.length).toBeGreaterThan(0);

    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      const badges = screen.getAllByTestId('alt-form-badge');
      expect(badges).toHaveLength(1);
    });
  });

  // ── Mutation calls ────────────────────────────────────────────────────────

  it('calls ADD mutation when creating a new term', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/Canonical Form/i), {
      target: { value: 'ספירות' },
    });
    fireEvent.change(screen.getByLabelText(/Short Definition/i), {
      target: { value: 'Divine attributes' },
    });
    fireEvent.click(screen.getByText('Save Term'));

    await waitFor(() => {
      expect(mockExecAdd).toHaveBeenCalled();
    });
  });

  it('calls onSave after successful add mutation', async () => {
    const onSave = vi.fn();
    renderForm({ onSave });
    fireEvent.change(screen.getByLabelText(/Canonical Form/i), {
      target: { value: 'כתר' },
    });
    fireEvent.change(screen.getByLabelText(/Short Definition/i), {
      target: { value: 'The Crown' },
    });
    fireEvent.click(screen.getByText('Save Term'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
  });

  // ── Cancel ────────────────────────────────────────────────────────────────

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    renderForm({ onCancel });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  it('shows "Saving..." text on submit button when mutation is fetching', async () => {
    const { useMutation } = vi.mocked(await import('urql'));
    useMutation.mockReturnValue([{ fetching: true }, mockExecAdd] as never);

    renderForm();
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByText('Saving...')).toBeDisabled();
  });
});
