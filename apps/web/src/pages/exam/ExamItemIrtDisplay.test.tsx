import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import { ExamItemIrtDisplay } from './ExamItemIrtDisplay';

describe('ExamItemIrtDisplay', () => {
  it('renders without crash', () => {
    const item = {
      id: 'item-1',
      calibrationStatus: 'CALIBRATED' as const,
      irtA: 1.2,
      irtB: 0.5,
      irtC: 0.2,
    };
    const { container } = render(<ExamItemIrtDisplay item={item} />);
    expect(container).toBeTruthy();
  });
});
