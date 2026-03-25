import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div {...p}>{children}</div>,
  CardContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardTitle: ({ children }: React.PropsWithChildren) => <h3>{children}</h3>,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button onClick={onClick} {...p}>{children}</button>,
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: React.PropsWithChildren<{ open?: boolean }>) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
  DialogDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  DialogFooter: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
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
