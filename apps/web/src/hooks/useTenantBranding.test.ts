import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as urql from 'urql';

// Mock applyTenantBranding
vi.mock('@/lib/branding', () => ({
  applyTenantBranding: vi.fn(),
  DEFAULT_BRANDING: {
    logoUrl: '/defaults/logo.svg',
    faviconUrl: '/defaults/favicon.ico',
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    accentColor: '#f59e0b',
    backgroundColor: '#ffffff',
    fontFamily: 'Inter',
    organizationName: 'EduSphere',
    hideEduSphereBranding: false,
  },
}));

vi.mock('@/lib/graphql/branding.queries', () => ({
  TENANT_BRANDING_QUERY: 'TENANT_BRANDING_QUERY',
}));

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof urql>();
  return { ...actual, useQuery: vi.fn() };
});

import { renderHook } from '@testing-library/react';
import { useTenantBranding } from './useTenantBranding';
import { applyTenantBranding } from '@/lib/branding';

const MOCK_BRANDING = {
  logoUrl: '/logo.png',
  faviconUrl: '/fav.ico',
  primaryColor: '#7c3aed',
  secondaryColor: '#64748b',
  accentColor: '#f59e0b',
  backgroundColor: '#ffffff',
  fontFamily: 'Inter',
  organizationName: 'AcmeCorp',
  hideEduSphereBranding: false,
  customCss: null,
};

describe('useTenantBranding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.getElementById('tenant-custom-css')?.remove();
  });

  it('calls applyTenantBranding when data arrives', () => {
    vi.mocked(urql.useQuery).mockReturnValue([{ data: { myTenantBranding: MOCK_BRANDING }, fetching: false, stale: false }] as never);
    renderHook(() => useTenantBranding());
    expect(applyTenantBranding).toHaveBeenCalledWith(MOCK_BRANDING);
  });

  it('does NOT call applyTenantBranding while fetching (no data yet)', () => {
    vi.mocked(urql.useQuery).mockReturnValue([{ data: undefined, fetching: true, stale: false }] as never);
    renderHook(() => useTenantBranding());
    expect(applyTenantBranding).not.toHaveBeenCalled();
  });

  it('injects customCss into document head when present', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myTenantBranding: { ...MOCK_BRANDING, customCss: '.foo { color: red; }' } }, fetching: false, stale: false }
    ] as never);
    renderHook(() => useTenantBranding());
    const el = document.getElementById('tenant-custom-css');
    expect(el?.textContent).toContain('.foo');
  });

  it('removes customCss style tag when css is null', () => {
    // First add one
    const el = document.createElement('style');
    el.id = 'tenant-custom-css';
    document.head.appendChild(el);

    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myTenantBranding: { ...MOCK_BRANDING, customCss: null } }, fetching: false, stale: false }
    ] as never);
    renderHook(() => useTenantBranding());
    expect(document.getElementById('tenant-custom-css')).toBeNull();
  });

  it('returns DEFAULT_BRANDING when no data', () => {
    vi.mocked(urql.useQuery).mockReturnValue([{ data: undefined, fetching: false, stale: false }] as never);
    const { result } = renderHook(() => useTenantBranding());
    expect(result.current.branding.organizationName).toBe('EduSphere');
  });
});
