import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/components/SourceManager', () => ({
  SourceManager: () => <div data-testid="source-manager" />,
}));

import React from 'react';
import { CourseSourcesPanel } from './CourseSourcesPanel';

describe('CourseSourcesPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders toggle button with knowledgeSources text', () => {
    render(<CourseSourcesPanel courseId="c-1" />);
    expect(screen.getByText('knowledgeSources')).toBeInTheDocument();
  });

  it('does not show sources panel initially', () => {
    render(<CourseSourcesPanel courseId="c-1" />);
    expect(screen.queryByTestId('sources-panel')).not.toBeInTheDocument();
  });

  it('shows sources panel after toggle click', () => {
    render(<CourseSourcesPanel courseId="c-1" />);
    fireEvent.click(screen.getByTestId('toggle-sources'));
    expect(screen.getByTestId('sources-panel')).toBeInTheDocument();
    expect(screen.getByTestId('source-manager')).toBeInTheDocument();
  });

  it('hides sources panel after second toggle click', () => {
    render(<CourseSourcesPanel courseId="c-1" />);
    fireEvent.click(screen.getByTestId('toggle-sources'));
    fireEvent.click(screen.getByTestId('toggle-sources'));
    expect(screen.queryByTestId('sources-panel')).not.toBeInTheDocument();
  });

  it('has aria-expanded attribute on toggle button', () => {
    render(<CourseSourcesPanel courseId="c-1" />);
    const btn = screen.getByTestId('toggle-sources');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });
});
