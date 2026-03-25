import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PendingInvitesTable } from './TeamManagement.invites';

const t = (k: string) => k;

describe('PendingInvitesTable', () => {
  it('shows loading text when fetching', () => {
    render(<PendingInvitesTable invites={[]} fetching={true} t={t} />);
    expect(screen.getByText('team.loading')).toBeInTheDocument();
  });

  it('shows no invites message when list is empty', () => {
    render(<PendingInvitesTable invites={[]} fetching={false} t={t} />);
    expect(screen.getByText('team.noInvites')).toBeInTheDocument();
  });

  it('renders invite rows with email, role, and status', () => {
    const invites = [
      { id: '1', email: 'alice@test.com', role: 'STUDENT', status: 'pending' },
      { id: '2', email: 'bob@test.com', role: 'INSTRUCTOR', status: 'sent' },
    ];
    render(<PendingInvitesTable invites={invites} fetching={false} t={t} />);
    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
    expect(screen.getByText('bob@test.com')).toBeInTheDocument();
    expect(screen.getByText('STUDENT')).toBeInTheDocument();
    expect(screen.getByText('INSTRUCTOR')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('sent')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    const invites = [{ id: '1', email: 'x@y.com', role: 'STUDENT', status: 'pending' }];
    render(<PendingInvitesTable invites={invites} fetching={false} t={t} />);
    expect(screen.getByText('team.colEmail')).toBeInTheDocument();
    expect(screen.getByText('team.colRole')).toBeInTheDocument();
    expect(screen.getByText('team.colStatus')).toBeInTheDocument();
  });

  it('renders pending title', () => {
    render(<PendingInvitesTable invites={[]} fetching={false} t={t} />);
    expect(screen.getByText('team.pendingTitle')).toBeInTheDocument();
  });
});
