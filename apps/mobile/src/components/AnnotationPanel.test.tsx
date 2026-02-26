/**
 * AnnotationPanel tests
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Apollo mock -----------------------------------------------------------
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
vi.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  gql: (s: TemplateStringsArray) => s.join(''),
}));

// --- NetInfo mock -----------------------------------------------------------
const mockUseNetInfo = vi.fn();
vi.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => mockUseNetInfo(),
}));

import AnnotationPanel from './AnnotationPanel';

const ANNOTATIONS = [
  {
    id: 'a1',
    text: 'Great point here',
    createdAt: '2025-01-01T00:00:00Z',
    author: { displayName: 'Alice' },
  },
  {
    id: 'a2',
    text: 'Need to revisit',
    createdAt: '2025-01-02T00:00:00Z',
    author: { displayName: 'Bob' },
  },
];

const mockMutateFn = vi.fn().mockResolvedValue({ data: {} });

beforeEach(() => {
  vi.clearAllMocks();
  mockUseNetInfo.mockReturnValue({ isConnected: true });
  mockUseQuery.mockReturnValue({
    data: { annotations: ANNOTATIONS },
    loading: false,
  });
  mockUseMutation.mockReturnValue([mockMutateFn, { loading: false }]);
});

describe('AnnotationPanel', () => {
  it('renders annotation list', () => {
    const { getByTestId } = render(
      <AnnotationPanel contentId="content-1" onClose={vi.fn()} />
    );
    expect(getByTestId('annotation-list')).toBeTruthy();
  });

  it('input field captures text', () => {
    const { getByTestId } = render(
      <AnnotationPanel contentId="content-1" onClose={vi.fn()} />
    );
    const input = getByTestId('annotation-input');
    fireEvent.changeText(input, 'My new annotation');
    expect(input.props.value).toBe('My new annotation');
  });

  it('submit button calls mutation', async () => {
    const { getByTestId } = render(
      <AnnotationPanel contentId="content-1" onClose={vi.fn()} />
    );
    const input = getByTestId('annotation-input');
    fireEvent.changeText(input, 'Test annotation');
    const submitBtn = getByTestId('annotation-submit');
    fireEvent.press(submitBtn);
    expect(mockMutateFn).toHaveBeenCalledWith({
      variables: { contentId: 'content-1', text: 'Test annotation' },
    });
  });

  it('is read-only when offline — shows read-only banner and no input', () => {
    mockUseNetInfo.mockReturnValue({ isConnected: false });
    const { getByTestId, queryByTestId } = render(
      <AnnotationPanel contentId="content-1" onClose={vi.fn()} />
    );
    expect(getByTestId('read-only-banner')).toBeTruthy();
    expect(queryByTestId('annotation-input')).toBeNull();
  });
});
