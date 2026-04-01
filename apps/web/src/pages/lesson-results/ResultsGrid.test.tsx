import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    variant?: string;
    size?: string;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('./ResultCard', () => ({
  ResultCard: ({
    title,
    testId,
    children,
  }: {
    title: string;
    testId: string;
    children: React.ReactNode;
  }) => (
    <div data-testid={testId}>
      {title}
      {children}
    </div>
  ),
  ExpandableText: ({ text, testId }: { text: string; testId: string }) => (
    <pre data-testid={testId}>{text}</pre>
  ),
}));

import { ResultsGrid } from './ResultsGrid';

describe('ResultsGrid', () => {
  it('renders without crash with empty results', () => {
    const emptyResults = {
      ingestion: undefined,
      asr: undefined,
      nerLinking: undefined,
      cleaning: undefined,
      summarize: undefined,
      structured: undefined,
      diagram: undefined,
      citations: undefined,
      qa: undefined,
      publish: undefined,
      transcript: undefined,
      asrLanguage: undefined,
      asrDuration: undefined,
      ingestedUrl: undefined,
      cleanedText: undefined,
      entities: undefined,
      linkedSources: undefined,
      shortSummary: undefined,
      keyPoints: undefined,
      notesMarkdown: undefined,
      mermaidSrc: undefined,
      verifiedCount: 0,
      failedCount: 0,
      matchReport: undefined,
      qaScore: undefined,
      fixList: undefined,
      publishReady: undefined,
      publishedUrl: undefined,
    };
    const { container } = render(
      <MemoryRouter>
        <ResultsGrid courseId="c-1" lessonId="l-1" r={emptyResults} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
