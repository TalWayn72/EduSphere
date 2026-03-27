import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';

describe('Dialog', () => {
  const renderDialog = (open = true) =>
    render(
      <Dialog open={open}>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Title</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogHeader>
          <p>Body content</p>
          <DialogFooter>
            <button>Close</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

  it('renders dialog content when open', () => {
    renderDialog(true);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    renderDialog(false);
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('renders a close button with sr-only text', () => {
    renderDialog(true);
    expect(screen.getByText('Close', { selector: '.sr-only' })).toBeInTheDocument();
  });

  it('renders the trigger button', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
      </Dialog>
    );
    expect(screen.getByText('Open')).toBeInTheDocument();
  });
});

describe('DialogHeader', () => {
  it('renders children and forwards className', () => {
    render(<DialogHeader className="mt-2" data-testid="hdr">Header</DialogHeader>);
    const el = screen.getByTestId('hdr');
    expect(el).toHaveClass('mt-2');
    expect(el).toHaveTextContent('Header');
  });

  it('has correct displayName', () => {
    expect(DialogHeader.displayName).toBe('DialogHeader');
  });
});

describe('DialogFooter', () => {
  it('renders children and forwards className', () => {
    render(<DialogFooter className="mt-4" data-testid="ftr">Footer</DialogFooter>);
    const el = screen.getByTestId('ftr');
    expect(el).toHaveClass('mt-4');
    expect(el).toHaveTextContent('Footer');
  });

  it('has correct displayName', () => {
    expect(DialogFooter.displayName).toBe('DialogFooter');
  });
});

describe('DialogTitle', () => {
  it('has correct displayName', () => {
    expect(DialogTitle.displayName).toBe('DialogTitle');
  });
});

describe('DialogDescription', () => {
  it('has correct displayName', () => {
    expect(DialogDescription.displayName).toBe('DialogDescription');
  });
});
