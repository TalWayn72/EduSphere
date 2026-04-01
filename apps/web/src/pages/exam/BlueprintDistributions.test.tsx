import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/exam/BlueprintDistributionEditor', () => ({
  BlueprintDistributionEditor: () => <div data-testid="distribution-editor" />,
}));

import { BlueprintDistributions } from './BlueprintDistributions';

describe('BlueprintDistributions', () => {
  it('renders without crash', () => {
    const { container } = render(
      <BlueprintDistributions
        domainDist={[]}
        onDomainDistChange={vi.fn()}
        bloomDist={[]}
        onBloomDistChange={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });
});
