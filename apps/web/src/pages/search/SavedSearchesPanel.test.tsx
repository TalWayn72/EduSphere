import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, d?: string) => d ?? k }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode; variant?: string; size?: string }) =>
    <button {...props}>{children}</button>,
}));

vi.mock('lucide-react', () => ({
  X: () => <span>x</span>,
  Trash2: () => <span>trash</span>,
}));

import { SavedSearchesPanel } from './SavedSearchesPanel';

describe('SavedSearchesPanel', () => {
  it('renders without crash with empty list', () => {
    const { container } = render(
      <SavedSearchesPanel savedSearches={[]} onLoad={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />
    );
    expect(container).toBeTruthy();
  });
});
