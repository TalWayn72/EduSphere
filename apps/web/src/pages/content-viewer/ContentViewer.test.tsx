import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ courseId: 'c-1', contentItemId: 'ci-1' }) };
});

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ data: null, fetching: false, error: null }]),
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
  useSubscription: vi.fn(() => [{ data: null, fetching: false, error: null }]),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => ({ id: 'u-1', role: 'STUDENT' }),
  DEV_MODE: true,
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('./VideoSection', () => ({
  VideoSection: () => <div data-testid="video-section" />,
}));

vi.mock('./AiChatPanel', () => ({
  AiChatPanel: () => <div data-testid="ai-chat-panel" />,
}));

vi.mock('./AnnotationsPanel', () => ({
  AnnotationsPanel: () => <div data-testid="annotations-panel" />,
}));

vi.mock('./KnowledgeGraphPreview', () => ({
  KnowledgeGraphPreview: () => <div data-testid="kg-preview" />,
}));

import { ContentViewer } from './ContentViewer';

describe('ContentViewer', () => {
  it('renders without crash', () => {
    const { container } = render(<MemoryRouter><ContentViewer /></MemoryRouter>);
    expect(container).toBeTruthy();
  });
});
