/**
 * CourseViewerScreen tests
 * Uses vitest + mocked Apollo and NetInfo.
 */
import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render } from '@testing-library/react-native';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Apollo mock -----------------------------------------------------------
const mockUseQuery = vi.fn();
vi.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  gql: (s: TemplateStringsArray) => s.join(''),
}));

// --- NetInfo mock -----------------------------------------------------------
const mockUseNetInfo = vi.fn();
vi.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => mockUseNetInfo(),
}));

// --- Navigation mock -------------------------------------------------------
vi.mock('../navigation', () => ({ default: {} }));

import CourseViewerScreen from './CourseViewerScreen';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';

type CourseViewerScreenProps = NativeStackScreenProps<RootStackParamList, 'CourseViewer'>;

const MOCK_ROUTE = {
  params: { courseId: 'course-1' },
  key: 'CourseViewer',
  name: 'CourseViewer' as const,
};
const MOCK_NAV = {} as unknown as CourseViewerScreenProps['navigation'];

const MOCK_COURSE = {
  id: 'course-1',
  title: 'Introduction to GraphQL',
  description: 'Learn GraphQL from scratch.',
  modules: [
    {
      id: 'm1',
      title: 'Getting Started',
      contentItems: [{ id: 'ci1', title: 'Basics', type: 'READING' }],
    },
    { id: 'm2', title: 'Advanced Topics', contentItems: [] },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseNetInfo.mockReturnValue({ isConnected: true });
});

describe('CourseViewerScreen', () => {
  it('renders course title when data is loaded', () => {
    mockUseQuery.mockReturnValue({
      data: { course: MOCK_COURSE },
      loading: false,
      error: undefined,
    });

    const { getByTestId } = render(
      <CourseViewerScreen route={MOCK_ROUTE as unknown as CourseViewerScreenProps['route']} navigation={MOCK_NAV} />
    );

    const titleEl = getByTestId('course-title');
    expect(titleEl.props.children).toBe('Introduction to GraphQL');
  });

  it('renders module list', () => {
    mockUseQuery.mockReturnValue({
      data: { course: MOCK_COURSE },
      loading: false,
      error: undefined,
    });

    const { getByTestId } = render(
      <CourseViewerScreen route={MOCK_ROUTE as unknown as CourseViewerScreenProps['route']} navigation={MOCK_NAV} />
    );

    expect(getByTestId('module-list')).toBeTruthy();
    expect(getByTestId('module-row-m1')).toBeTruthy();
    expect(getByTestId('module-row-m2')).toBeTruthy();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
    });

    const { getByType } = render(
      <CourseViewerScreen route={MOCK_ROUTE as unknown as CourseViewerScreenProps['route']} navigation={MOCK_NAV} />
    );

    // ActivityIndicator is rendered during loading
    expect(getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows offline indicator when offline', () => {
    mockUseNetInfo.mockReturnValue({ isConnected: false });
    mockUseQuery.mockReturnValue({
      data: { course: MOCK_COURSE },
      loading: false,
      error: undefined,
    });

    const { getByTestId } = render(
      <CourseViewerScreen route={MOCK_ROUTE as unknown as CourseViewerScreenProps['route']} navigation={MOCK_NAV} />
    );

    expect(getByTestId('offline-indicator')).toBeTruthy();
  });
});
