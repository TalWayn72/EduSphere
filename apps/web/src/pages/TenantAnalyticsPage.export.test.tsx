/**
 * ExportAnalyticsButton — unit tests (standalone, no module-level mocks).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as urql from 'urql';

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof urql>();
  return {
    ...actual,
    gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
      strings.reduce(
        (acc: string, str: string, i: number) =>
          acc + str + String(values[i] ?? ''),
        ''
      ),
    useMutation: vi.fn(),
  };
});

vi.mock('@/lib/graphql/tenant-analytics.queries', () => ({
  EXPORT_TENANT_ANALYTICS_MUTATION: 'EXPORT_TENANT_ANALYTICS_MUTATION',
}));

import { ExportAnalyticsButton } from './TenantAnalyticsPage.export';

describe('ExportAnalyticsButton', () => {
  beforeEach(() => {
    vi.mocked(urql.useMutation).mockReturnValue(
      [{ fetching: false }, vi.fn().mockResolvedValue({ data: undefined })] as never
    );
  });

  it('renders Export CSV button', () => {
    render(<ExportAnalyticsButton period="THIRTY_DAYS" />);
    expect(screen.getByRole('button', { name: /Export analytics as CSV/i })).toBeInTheDocument();
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });

  it('is disabled while exporting', () => {
    vi.mocked(urql.useMutation).mockReturnValue(
      [{ fetching: true }, vi.fn()] as never
    );
    render(<ExportAnalyticsButton period="THIRTY_DAYS" />);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Exporting…')).toBeInTheDocument();
  });

  it('is enabled when not fetching', () => {
    render(<ExportAnalyticsButton period="NINETY_DAYS" />);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });
});
