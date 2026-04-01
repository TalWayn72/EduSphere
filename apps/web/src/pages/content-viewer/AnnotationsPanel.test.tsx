import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('lucide-react', () => ({
  FileText: () => <span>file</span>,
  Plus: () => <span>plus</span>,
}));

vi.mock('@/components/LayerToggleBar', () => ({
  LayerToggleBar: () => <div data-testid="layer-toggle" />,
}));

vi.mock('@/components/AnnotationThread', () => ({
  AnnotationThread: () => <div data-testid="annotation-thread" />,
}));

vi.mock('./ContentViewerHelpers', () => ({
  SkeletonLine: () => <div />,
}));

vi.mock('./KnowledgeGraphPreview', () => ({
  KnowledgeGraphPreview: () => <div />,
}));

import { AnnotationsPanel } from './AnnotationsPanel';

describe('AnnotationsPanel', () => {
  it('renders without crash', () => {
    const { container } = render(
      <AnnotationsPanel
        annotations={[]}
        transcript={[]}
        annotFetching={false}
        activeLayers={[]}
        showAnnotationForm={false}
        newAnnotation=""
        newLayer="PERSONAL"
        currentTime={0}
        searchQuery=""
        onToggleLayer={vi.fn()}
        onToggleForm={vi.fn()}
        onNewAnnotationChange={vi.fn()}
        onNewLayerChange={vi.fn()}
        onAddAnnotation={vi.fn()}
        onCloseForm={vi.fn()}
        onSearchChange={vi.fn()}
        onSeek={vi.fn()}
        onReply={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });
});
