import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock react-resizable-panels (aliased to tiptap-stub in vitest config)
vi.mock('react-resizable-panels', () => ({
  Group: function MockGroup({ children, className, orientation, ...props }: Record<string, unknown>) {
    return <div data-testid="panel-group" data-orientation={orientation} className={className as string} {...props}>{children as React.ReactNode}</div>;
  },
  Panel: function MockPanel({ children, ...props }: Record<string, unknown>) {
    return <div data-testid="panel" {...props}>{children as React.ReactNode}</div>;
  },
  Separator: function MockSeparator({ children, className, ...props }: Record<string, unknown>) {
    return <div data-testid="separator" className={className as string} {...props}>{children as React.ReactNode}</div>;
  },
}));

// Mock lucide-react icons used in resizable (GripVertical)
vi.mock('lucide-react', () => ({
  GripVertical: function MockGripVertical(props: Record<string, unknown>) {
    return <span data-testid="icon-GripVertical" {...props} />;
  },
}));

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './resizable';

describe('ResizablePanelGroup', () => {
  it('renders children', () => {
    render(
      <ResizablePanelGroup orientation="horizontal">
        <div>Panel A</div>
      </ResizablePanelGroup>
    );
    expect(screen.getByText('Panel A')).toBeInTheDocument();
  });

  it('forwards className', () => {
    render(
      <ResizablePanelGroup className="h-full" orientation="horizontal">
        <div>P</div>
      </ResizablePanelGroup>
    );
    expect(screen.getByTestId('panel-group')).toHaveClass('h-full');
  });

  it('passes orientation to underlying Group', () => {
    render(
      <ResizablePanelGroup orientation="vertical">
        <div>V</div>
      </ResizablePanelGroup>
    );
    expect(screen.getByTestId('panel-group')).toHaveAttribute('data-orientation', 'vertical');
  });
});

describe('ResizablePanel', () => {
  it('renders children', () => {
    render(<ResizablePanel>Content</ResizablePanel>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('ResizableHandle', () => {
  it('renders without handle by default', () => {
    render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizableHandle />
      </ResizablePanelGroup>
    );
    expect(screen.getByTestId('separator')).toBeInTheDocument();
    expect(screen.queryByTestId('icon-GripVertical')).not.toBeInTheDocument();
  });

  it('renders with handle when withHandle is true', () => {
    render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizableHandle withHandle />
      </ResizablePanelGroup>
    );
    expect(screen.getByTestId('icon-GripVertical')).toBeInTheDocument();
  });

  it('forwards className', () => {
    render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizableHandle className="bg-red" />
      </ResizablePanelGroup>
    );
    expect(screen.getByTestId('separator')).toHaveClass('bg-red');
  });
});
