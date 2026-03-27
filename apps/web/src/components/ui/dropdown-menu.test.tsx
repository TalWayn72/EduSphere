import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from './dropdown-menu';

describe('DropdownMenu', () => {
  it('renders the trigger', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
      </DropdownMenu>
    );
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('shows content when open', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
          <DropdownMenuItem>Item 2</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('does not show content when closed', () => {
    render(
      <DropdownMenu open={false}>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
  });
});

describe('DropdownMenuShortcut', () => {
  it('renders shortcut text', () => {
    render(<DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>);
    expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
  });

  it('forwards className', () => {
    render(<DropdownMenuShortcut className="ml-4" data-testid="sc">K</DropdownMenuShortcut>);
    expect(screen.getByTestId('sc')).toHaveClass('ml-4');
  });

  it('has correct displayName', () => {
    expect(DropdownMenuShortcut.displayName).toBe('DropdownMenuShortcut');
  });
});

describe('DropdownMenuLabel displayName', () => {
  it('has correct displayName', () => {
    expect(DropdownMenuLabel.displayName).toBe('DropdownMenuLabel');
  });
});

describe('DropdownMenuSeparator displayName', () => {
  it('has correct displayName', () => {
    expect(DropdownMenuSeparator.displayName).toBe('DropdownMenuSeparator');
  });
});
