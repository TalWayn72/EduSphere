import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...p }: any) => <div {...p}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...p }: any) => <button onClick={onClick} {...p}>{children}</button>,
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

import { ApiKeySection } from './ApiKeySection';

describe('ApiKeySection', () => {
  it('shows masked key by default', () => {
    render(<MemoryRouter><ApiKeySection currentKey="esph_abc123xyz" showPlain={false} onRegenerate={vi.fn()} regenerating={false} /></MemoryRouter>);
    expect(document.body.textContent).toContain("esph_abc");
  });

  it('shows plain key when showPlain', () => {
    render(<MemoryRouter><ApiKeySection currentKey="esph_abc123xyz" showPlain={true} onRegenerate={vi.fn()} regenerating={false} /></MemoryRouter>);
    expect(document.body.textContent).toContain("esph_abc123xyz");
  });
});