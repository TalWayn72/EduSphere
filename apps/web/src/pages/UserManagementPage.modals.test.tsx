import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, str, i) => acc + str + (String(values[i] ?? '')), ''),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { InviteUserModal, BulkImportModal } from './UserManagementPage.modals';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOOP_EXECUTE = vi.fn().mockResolvedValue({ data: null, error: undefined });

function setupMutation(overrideFn = NOOP_EXECUTE) {
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false },
    overrideFn,
  ] as never);
}

// ── InviteUserModal tests ──────────────────────────────────────────────────────

describe('InviteUserModal', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  function renderModal(open = true) {
    return render(
      <InviteUserModal
        open={open}
        onClose={onClose}
        tenantId="tenant-1"
        onSuccess={onSuccess}
      />
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupMutation();
  });

  it('renders "Invite User" dialog title when open', () => {
    renderModal();
    expect(screen.getByText('Invite User')).toBeInTheDocument();
  });

  it('renders First Name, Last Name, Email, and Role fields', () => {
    renderModal();
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
  });

  it('renders Invite and Cancel buttons', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error alert when mutation returns an error', async () => {
    const createUserFn = vi.fn().mockResolvedValue({
      error: { message: 'Email already taken' },
    });
    setupMutation(createUserFn);
    renderModal();

    // Fill required fields before submitting
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0]!, { target: { value: 'John' } });
    fireEvent.change(inputs[1]!, { target: { value: 'Doe' } });
    fireEvent.change(inputs[2]!, { target: { value: 'john@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /invite/i }));
    await waitFor(() =>
      expect(screen.getByText('Email already taken')).toBeInTheDocument()
    );
  });

  it('calls onSuccess and onClose on successful submission', async () => {
    const createUserFn = vi.fn().mockResolvedValue({ data: { createUser: { id: 'u1' } }, error: undefined });
    setupMutation(createUserFn);
    renderModal();

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0]!, { target: { value: 'Jane' } });
    fireEvent.change(inputs[1]!, { target: { value: 'Smith' } });
    fireEvent.change(inputs[2]!, { target: { value: 'jane@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /invite/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });
});

// ── BulkImportModal tests ──────────────────────────────────────────────────────

describe('BulkImportModal', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  function renderModal(open = true) {
    return render(
      <BulkImportModal open={open} onClose={onClose} onSuccess={onSuccess} />
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupMutation();
  });

  it('renders "Bulk Import Users" dialog title when open', () => {
    renderModal();
    expect(screen.getByText('Bulk Import Users')).toBeInTheDocument();
  });

  it('renders CSV instructions', () => {
    renderModal();
    expect(screen.getByText(/email,firstName,lastName,role/)).toBeInTheDocument();
  });

  it('renders Import button disabled when textarea is empty', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /import/i })).toBeDisabled();
  });

  it('enables Import button when textarea has content', () => {
    renderModal();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'email,firstName,lastName,role\njohn@test.com,John,Doe,STUDENT' },
    });
    expect(screen.getByRole('button', { name: /import/i })).not.toBeDisabled();
  });

  it('shows import results after successful import', async () => {
    const bulkFn = vi.fn().mockResolvedValue({
      data: {
        bulkImportUsers: { created: 3, updated: 1, failed: 0, errors: [] },
      },
    });
    setupMutation(bulkFn);
    renderModal();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'email,firstName,lastName,role\njohn@test.com,John,Doe,STUDENT' },
    });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() =>
      expect(screen.getByText(/Created: 3/)).toBeInTheDocument()
    );
    expect(screen.getByText(/Updated: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Failed: 0/)).toBeInTheDocument();
  });

  it('calls onSuccess when failed count is 0', async () => {
    const bulkFn = vi.fn().mockResolvedValue({
      data: {
        bulkImportUsers: { created: 2, updated: 0, failed: 0, errors: [] },
      },
    });
    setupMutation(bulkFn);
    renderModal();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'csv data here' },
    });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('shows error list when failures exist', async () => {
    const bulkFn = vi.fn().mockResolvedValue({
      data: {
        bulkImportUsers: {
          created: 1,
          updated: 0,
          failed: 1,
          errors: ['Row 2: invalid email'],
        },
      },
    });
    setupMutation(bulkFn);
    renderModal();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'bad,data' },
    });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() =>
      expect(screen.getByText('Row 2: invalid email')).toBeInTheDocument()
    );
  });

  it('calls onClose when Close button is clicked', () => {
    renderModal();
    // Multiple close elements exist (dialog X button + Close footer button); use the footer one
    const closeBtns = screen.getAllByRole('button', { name: /close/i });
    fireEvent.click(closeBtns[closeBtns.length - 1]!);
    expect(onClose).toHaveBeenCalled();
  });
});
