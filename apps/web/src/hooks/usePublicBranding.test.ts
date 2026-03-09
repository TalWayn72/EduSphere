import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as urql from 'urql';

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ data: null, fetching: false }]),
  gql: (s: TemplateStringsArray) => s[0],
}));

vi.mock('@/lib/graphql/branding.queries', () => ({
  PUBLIC_BRANDING_QUERY: 'PUBLIC_BRANDING_QUERY',
}));

vi.mock('@/lib/branding', () => ({
  DEFAULT_BRANDING: {
    organizationName: 'EduSphere',
    primaryColor: '#6366F1',
    logoUrl: '',
    faviconUrl: '',
    accentColor: '#6366F1',
  },
}));

import { usePublicBranding } from './usePublicBranding';

describe('usePublicBranding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null branding when slug is null', () => {
    const { result } = renderHook(() => usePublicBranding(null));
    expect(result.current.branding).toBeNull();
  });

  it('pauses query when slug is null', () => {
    usePublicBranding(null);
    const [, opts] = (vi.mocked(urql.useQuery) as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(opts?.pause).toBe(true);
  });

  it('returns branding data when available', () => {
    vi.mocked(urql.useQuery).mockReturnValueOnce([
      {
        data: {
          publicBranding: {
            primaryColor: '#FF0000',
            accentColor: '#00FF00',
            logoUrl: 'https://example.com/logo.png',
            faviconUrl: 'https://example.com/fav.ico',
            organizationName: 'Acme Corp',
            tagline: 'Learning for all',
          },
        },
        fetching: false,
      },
    ] as never);
    const { result } = renderHook(() => usePublicBranding('acme'));
    expect(result.current.branding?.organizationName).toBe('Acme Corp');
  });
});
