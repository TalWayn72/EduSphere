import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@/hooks/useTenantBranding', () => ({
  useTenantBranding: vi.fn(() => ({
    branding: {
      organizationName: 'TestOrg',
      primaryColor: '#2563eb',
      hideEduSphereBranding: false,
    },
    fetching: false,
  })),
}));

import { BrandingProvider, useBranding } from './BrandingContext';

function TestConsumer() {
  const { branding, fetching } = useBranding();
  return (
    <div>
      <span data-testid="org">{branding.organizationName}</span>
      <span data-testid="fetching">{String(fetching)}</span>
    </div>
  );
}

describe('BrandingContext', () => {
  it('provides branding from hook to children', () => {
    render(React.createElement(BrandingProvider, {}, React.createElement(TestConsumer)));
    expect(screen.getByTestId('org').textContent).toBe('TestOrg');
  });

  it('propagates fetching state', () => {
    render(React.createElement(BrandingProvider, {}, React.createElement(TestConsumer)));
    expect(screen.getByTestId('fetching').textContent).toBe('false');
  });

  it('returns default branding outside provider', () => {
    render(React.createElement(TestConsumer));
    expect(screen.getByTestId('org').textContent).toBe('EduSphere');
  });
});
