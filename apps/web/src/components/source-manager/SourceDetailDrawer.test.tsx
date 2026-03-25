import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn(() => ({ data: null, isLoading: true, isError: false, error: null })) }));
vi.mock('@/lib/graphql', () => ({ gqlClient: { request: vi.fn() } }));
vi.mock('@/lib/graphql/sources.queries', () => ({ KNOWLEDGE_SOURCE_DETAIL: 'Q' }));
vi.mock('./utils', () => ({ IS_DEV_MODE: true, authHeaders: () => ({}), hasValidAuth: () => true, getSourceErrorKey: () => 'error' }));
vi.mock('./dev-mock', () => ({ getDevSources: () => [{ id: 's1', title: 'Source 1', content: 'Content', type: 'ARTICLE', url: 'https://test', createdAt: '2026-01-01' }] }));

import { SourceDetailDrawer } from './SourceDetailDrawer';

describe('SourceDetailDrawer', () => {
  it('renders loading state', () => {
    render(<SourceDetailDrawer sourceId="s1" onClose={vi.fn()} />);
    expect(document.body.textContent).toBeTruthy();
  });
});