/**
 * RoleManagementPage.detail.test.tsx
 * Tests for RoleDetailPanel component.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoleDetailPanel } from './RoleManagementPage.detail';
import { RoleRecord } from '@/lib/graphql/admin-roles.permissions';

const SYSTEM_ROLE: RoleRecord = {
  id: 'system-org-admin',
  name: 'ORG_ADMIN',
  description: 'Organisation administrator with full tenant management access.',
  isSystem: true,
  userCount: 14,
  permissions: ['courses:view', 'users:view', 'analytics:view'],
};

const CUSTOM_ROLE: RoleRecord = {
  id: 'custom-content-manager',
  name: 'CONTENT_MANAGER',
  description: 'Manages content only.',
  isSystem: false,
  userCount: 3,
  permissions: ['courses:view', 'courses:edit'],
};

function setup(role: RoleRecord) {
  const onDuplicate = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const utils = render(
    <RoleDetailPanel
      role={role}
      onDuplicate={onDuplicate}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
  return { ...utils, onDuplicate, onEdit, onDelete };
}

describe('RoleDetailPanel', () => {
  it('renders role name', () => {
    setup(SYSTEM_ROLE);
    expect(screen.getByText('ORG_ADMIN')).toBeInTheDocument();
  });

  it('renders role description', () => {
    setup(SYSTEM_ROLE);
    expect(
      screen.getByText(
        'Organisation administrator with full tenant management access.'
      )
    ).toBeInTheDocument();
  });

  it('shows user count badge', () => {
    setup(SYSTEM_ROLE);
    expect(screen.getByText('14 users')).toBeInTheDocument();
  });

  it('always renders Duplicate button', () => {
    setup(SYSTEM_ROLE);
    expect(
      screen.getByRole('button', { name: /duplicate/i })
    ).toBeInTheDocument();
  });

  it('hides Edit and Delete buttons for system roles', () => {
    setup(SYSTEM_ROLE);
    expect(
      screen.queryByRole('button', { name: /edit/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /delete/i })
    ).not.toBeInTheDocument();
  });

  it('shows Edit and Delete buttons for custom roles', () => {
    setup(CUSTOM_ROLE);
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('calls onDuplicate with the role when Duplicate is clicked', () => {
    const { onDuplicate } = setup(CUSTOM_ROLE);
    fireEvent.click(screen.getByRole('button', { name: /duplicate/i }));
    expect(onDuplicate).toHaveBeenCalledWith(CUSTOM_ROLE);
  });

  it('calls onEdit with the role when Edit is clicked', () => {
    const { onEdit } = setup(CUSTOM_ROLE);
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(CUSTOM_ROLE);
  });

  it('calls onDelete with the role when Delete is clicked', () => {
    const { onDelete } = setup(CUSTOM_ROLE);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(CUSTOM_ROLE);
  });

  it('shows read-only note for system roles', () => {
    setup(SYSTEM_ROLE);
    expect(screen.getByText(/system role — read-only/i)).toBeInTheDocument();
  });

  it('renders permission groups in the matrix', () => {
    setup(SYSTEM_ROLE);
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('marks granted permissions with checked checkbox', () => {
    setup(CUSTOM_ROLE);
    // courses:view and courses:edit are in CUSTOM_ROLE.permissions
    const viewCourses = screen.getByRole('checkbox', { name: 'View courses' });
    expect(viewCourses).toBeChecked();
  });

  it('marks un-granted permissions as unchecked', () => {
    setup(CUSTOM_ROLE);
    const createCourses = screen.getByRole('checkbox', {
      name: 'Create courses',
    });
    expect(createCourses).not.toBeChecked();
  });
});
