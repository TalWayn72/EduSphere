import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ courseId: 'c-1', lessonId: 'l-1' }) };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ data: null, fetching: false, error: null }]),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode; variant?: string; size?: string }) =>
    <button {...props}>{children}</button>,
}));

vi.mock('@/components/Breadcrumbs', () => ({
  Breadcrumbs: () => <nav data-testid="breadcrumbs" />,
}));

vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner" />,
}));

vi.mock('./useLessonResults', () => ({
  extractResults: () => ({
    ingestion: undefined, asr: undefined, nerLinking: undefined,
    cleaning: undefined, summarize: undefined, structured: undefined,
    diagram: undefined, citations: undefined, qa: undefined, publish: undefined,
    transcript: undefined, asrLanguage: undefined, asrDuration: undefined,
    ingestedUrl: undefined, cleanedText: undefined, entities: undefined,
    linkedSources: undefined, shortSummary: undefined, keyPoints: undefined,
    notesMarkdown: undefined, mermaidSrc: undefined, verifiedCount: 0,
    failedCount: 0, matchReport: undefined, qaScore: undefined,
    fixList: undefined, publishReady: undefined, publishedUrl: undefined,
  }),
}));

vi.mock('./ResultsGrid', () => ({
  ResultsGrid: () => <div data-testid="results-grid" />,
}));

vi.mock('./AddVideoPanel', () => ({
  AddVideoPanel: () => <div data-testid="add-video-panel" />,
}));

import { LessonResultsPage } from './LessonResultsPage';

describe('LessonResultsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders inside Layout', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders without crash', () => {
    const { container } = render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(container).toBeTruthy();
  });
});
