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

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

import { SaveSearchModal } from './SaveSearchModal';

describe('SaveSearchModal', () => {
  it('renders without crash', () => {
    const { container } = render(
      <SaveSearchModal
        open={true}
        onClose={vi.fn()}
        name=""
        onNameChange={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });
});
