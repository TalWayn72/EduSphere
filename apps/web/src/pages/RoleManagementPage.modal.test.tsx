/**
 * RoleManagementPage.modal.test.tsx
 * Tests for RoleFormModal component.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoleFormModal } from './RoleManagementPage.modal';

function setup(
  open = true,
  initialRole?: {
    id?: string;
    name?: string;
    description?: string;
    permissions?: string[];
  }
) {
  const onClose = vi.fn();
  const onSave = vi.fn();
  const utils = render(
    <RoleFormModal
      open={open}
      initialRole={initialRole}
      onClose={onClose}
      onSave={onSave}
    />
  );
  return { ...utils, onClose, onSave };
}

describe('RoleFormModal', () => {
  it('renders "Create Custom Role" title when no initialRole.id', () => {
    setup(true);
    expect(screen.getByText('Create Custom Role')).toBeInTheDocument();
  });

  it('renders "Edit Custom Role" title when initialRole has id', () => {
    setup(true, { id: 'custom-1', name: 'Manager', permissions: [] });
    expect(screen.getByText('Edit Custom Role')).toBeInTheDocument();
  });

  it('renders role name and description inputs', () => {
    setup(true);
    expect(screen.getByLabelText('Role name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('renders permission group labels', () => {
    setup(true);
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('shows Cancel and Save role buttons', () => {
    setup(true);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /save role/i })
    ).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const { onClose } = setup(true);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pre-fills name when initialRole.name is provided', () => {
    setup(true, { name: 'Content Manager', permissions: [] });
    expect(screen.getByDisplayValue('Content Manager')).toBeInTheDocument();
  });

  it('shows validation error when form submitted with short name', async () => {
    setup(true);
    const nameInput = screen.getByLabelText('Role name');
    fireEvent.change(nameInput, { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: /save role/i }));
    await waitFor(() => {
      expect(
        screen.getByText('Name must be at least 2 characters')
      ).toBeInTheDocument();
    });
  });

  it('calls onSave with form values when valid form is submitted', async () => {
    const { onSave } = setup(true);
    fireEvent.change(screen.getByLabelText('Role name'), {
      target: { value: 'Content Manager' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save role/i }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
      expect(onSave.mock.calls[0]![0]!).toMatchObject({
        name: 'Content Manager',
      });
    });
  });

  it('does not render dialog content when open=false', () => {
    setup(false);
    expect(screen.queryByText('Create Custom Role')).not.toBeInTheDocument();
  });
});
