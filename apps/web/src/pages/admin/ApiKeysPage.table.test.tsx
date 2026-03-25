import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApiKeysTable, type ApiKey } from './ApiKeysPage.table';

const t = (k: string) => k;

const sampleKeys: ApiKey[] = [
  {
    id: 'k1', description: 'Production key', prefix: 'edsp_prod',
    isActive: true, createdAt: '2026-01-15T00:00:00Z', lastUsedAt: '2026-03-20T00:00:00Z',
  },
  {
    id: 'k2', description: 'Staging key', prefix: 'edsp_stag',
    isActive: false, createdAt: '2025-06-01T00:00:00Z', lastUsedAt: null,
  },
];

describe('ApiKeysTable', () => {
  it('shows loading text when fetching', () => {
    render(<ApiKeysTable keys={[]} fetching={true} onRevoke={vi.fn()} t={t} />);
    expect(screen.getByText('apiKeys.loading')).toBeInTheDocument();
  });

  it('shows no keys message when list is empty', () => {
    render(<ApiKeysTable keys={[]} fetching={false} onRevoke={vi.fn()} t={t} />);
    expect(screen.getByText('apiKeys.noKeys')).toBeInTheDocument();
  });

  it('renders key descriptions', () => {
    render(<ApiKeysTable keys={sampleKeys} fetching={false} onRevoke={vi.fn()} t={t} />);
    expect(screen.getByText('Production key')).toBeInTheDocument();
    expect(screen.getByText('Staging key')).toBeInTheDocument();
  });

  it('renders key prefixes', () => {
    render(<ApiKeysTable keys={sampleKeys} fetching={false} onRevoke={vi.fn()} t={t} />);
    expect(screen.getByText('edsp_prod...')).toBeInTheDocument();
    expect(screen.getByText('edsp_stag...')).toBeInTheDocument();
  });

  it('shows active/revoked status', () => {
    render(<ApiKeysTable keys={sampleKeys} fetching={false} onRevoke={vi.fn()} t={t} />);
    expect(screen.getByText('apiKeys.active')).toBeInTheDocument();
    expect(screen.getByText('apiKeys.revoked')).toBeInTheDocument();
  });

  it('shows revoke button only for active keys', () => {
    render(<ApiKeysTable keys={sampleKeys} fetching={false} onRevoke={vi.fn()} t={t} />);
    const revokeButtons = screen.getAllByText('apiKeys.revoke');
    expect(revokeButtons).toHaveLength(1); // only the active key
  });

  it('calls onRevoke with key id when revoke is clicked', () => {
    const onRevoke = vi.fn();
    render(<ApiKeysTable keys={sampleKeys} fetching={false} onRevoke={onRevoke} t={t} />);
    fireEvent.click(screen.getByText('apiKeys.revoke'));
    expect(onRevoke).toHaveBeenCalledWith('k1');
  });

  it('shows "never" for keys without lastUsedAt', () => {
    render(<ApiKeysTable keys={sampleKeys} fetching={false} onRevoke={vi.fn()} t={t} />);
    expect(screen.getByText('apiKeys.never')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<ApiKeysTable keys={sampleKeys} fetching={false} onRevoke={vi.fn()} t={t} />);
    expect(screen.getByText('apiKeys.colDescription')).toBeInTheDocument();
    expect(screen.getByText('apiKeys.colPrefix')).toBeInTheDocument();
    expect(screen.getByText('apiKeys.colStatus')).toBeInTheDocument();
  });
});
