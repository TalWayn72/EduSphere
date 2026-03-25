/**
 * ThemeProvider tests
 *
 * Verifies:
 *  1. Provides default branding when query has no data
 *  2. Provides branding data from query
 *  3. useTenantTheme hook returns context values
 *  4. Calls applyTenantBranding when data arrives
 *  5. isLoading reflects fetching state
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

vi.mock('@/lib/branding', () => ({
  applyTenantBranding: vi.fn(),
  detectTenantSlug: vi.fn().mockReturnValue(null),
  DEFAULT_BRANDING: {
    logoUrl: '',
    logoMarkUrl: '',
    faviconUrl: '',
    primaryColor: '#000000',
    secondaryColor: '#111111',
    accentColor: '#222222',
    backgroundColor: '#ffffff',
    fontFamily: 'Inter',
    organizationName: 'EduSphere',
    tagline: '',
    privacyPolicyUrl: '',
    termsOfServiceUrl: '',
    supportEmail: '',
    hideEduSphereBranding: false,
  },
}));

vi.mock('urql', () => ({
  useQuery: vi.fn(),
}));

import { ThemeProvider, useTenantTheme } from './ThemeProvider';
import { DEFAULT_BRANDING, applyTenantBranding } from '@/lib/branding';
import * as urql from 'urql';

const defaultQueryResult = {
  fetching: false,
  data: undefined,
  error: undefined,
  stale: false,
  extensions: undefined,
};

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ThemeProvider, null, children);
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides default branding when no query data', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { ...defaultQueryResult },
      vi.fn(),
    ] as never);

    const { result } = renderHook(() => useTenantTheme(), { wrapper });
    expect(result.current.branding).toEqual(DEFAULT_BRANDING);
  });

  it('provides branding from query data', () => {
    const customBranding = {
      ...DEFAULT_BRANDING,
      primaryColor: '#ff0000',
      organizationName: 'Custom Org',
    };
    vi.mocked(urql.useQuery).mockReturnValue([
      { ...defaultQueryResult, data: { tenantBranding: customBranding } },
      vi.fn(),
    ] as never);

    const { result } = renderHook(() => useTenantTheme(), { wrapper });
    expect(result.current.branding.primaryColor).toBe('#ff0000');
    expect(result.current.branding.organizationName).toBe('Custom Org');
  });

  it('reflects isLoading from fetching state', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { ...defaultQueryResult, fetching: true },
      vi.fn(),
    ] as never);

    const { result } = renderHook(() => useTenantTheme(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('calls applyTenantBranding when branding data arrives', () => {
    const customBranding = {
      ...DEFAULT_BRANDING,
      primaryColor: '#00ff00',
    };
    vi.mocked(urql.useQuery).mockReturnValue([
      { ...defaultQueryResult, data: { tenantBranding: customBranding } },
      vi.fn(),
    ] as never);

    renderHook(() => useTenantTheme(), { wrapper });
    expect(applyTenantBranding).toHaveBeenCalledWith(customBranding);
  });

  it('returns default context values when used outside provider', () => {
    const { result } = renderHook(() => useTenantTheme());
    expect(result.current.branding).toEqual(DEFAULT_BRANDING);
    expect(result.current.isLoading).toBe(true);
  });
});
