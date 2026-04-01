import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => <button {...props}>{children}</button>,
}));

import { GraphControls } from './GraphControls';

describe('GraphControls', () => {
  const onZoomIn = vi.fn();
  const onZoomOut = vi.fn();
  const onResetView = vi.fn();

  it('renders zoom in button', () => {
    render(
      <GraphControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetView={onResetView}
      />
    );
    expect(screen.getByTitle('Zoom in')).toBeInTheDocument();
  });

  it('renders zoom out button', () => {
    render(
      <GraphControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetView={onResetView}
      />
    );
    expect(screen.getByTitle('Zoom out')).toBeInTheDocument();
  });

  it('renders reset view button', () => {
    render(
      <GraphControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetView={onResetView}
      />
    );
    expect(screen.getByTitle('Reset view')).toBeInTheDocument();
  });

  it('calls onZoomIn when clicked', () => {
    render(
      <GraphControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetView={onResetView}
      />
    );
    fireEvent.click(screen.getByTitle('Zoom in'));
    expect(onZoomIn).toHaveBeenCalledOnce();
  });

  it('calls onZoomOut when clicked', () => {
    render(
      <GraphControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetView={onResetView}
      />
    );
    fireEvent.click(screen.getByTitle('Zoom out'));
    expect(onZoomOut).toHaveBeenCalledOnce();
  });

  it('calls onResetView when clicked', () => {
    render(
      <GraphControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetView={onResetView}
      />
    );
    fireEvent.click(screen.getByTitle('Reset view'));
    expect(onResetView).toHaveBeenCalledOnce();
  });
});
