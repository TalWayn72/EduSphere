import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  UPDATE_COURSE_MUTATION: 'UPDATE_COURSE_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CourseEditMetadata } from './CourseEditPage.metadata';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const INITIAL_VALUES = {
  title: 'Original Title',
  description: 'Original description',
  thumbnailUrl: '📚',
  estimatedHours: 8,
};

const SUCCESS_RESULT = {
  data: {
    updateCourse: {
      id: 'c1',
      title: 'New Title',
      description: null,
      thumbnailUrl: null,
      estimatedHours: null,
    },
  },
  error: undefined,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CourseEditMetadata', () => {
  const mockExecute = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue(SUCCESS_RESULT);
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      mockExecute,
    ] as never);
  });

  function renderForm(onSaved = vi.fn()) {
    return render(
      <CourseEditMetadata
        courseId="c1"
        initialValues={INITIAL_VALUES}
        onSaved={onSaved}
      />
    );
  }

  it('renders title input with the initial value', () => {
    renderForm();
    expect(screen.getByDisplayValue('Original Title')).toBeInTheDocument();
  });

  it('renders description textarea with the initial value', () => {
    renderForm();
    expect(
      screen.getByDisplayValue('Original description')
    ).toBeInTheDocument();
  });

  it('renders thumbnail input with the initial value', () => {
    renderForm();
    expect(screen.getByDisplayValue('📚')).toBeInTheDocument();
  });

  it('Save button is disabled when form has no changes', () => {
    renderForm();
    expect(
      screen.getByRole('button', { name: /save changes/i })
    ).toBeDisabled();
  });

  it('Save button is enabled after title is changed', async () => {
    renderForm();
    const titleInput = screen.getByDisplayValue('Original Title');
    fireEvent.change(titleInput, { target: { value: 'New Course Title' } });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /save changes/i })
      ).not.toBeDisabled();
    });
  });

  it('calls UPDATE_COURSE_MUTATION with only changed fields on submit', async () => {
    const onSaved = vi.fn();
    renderForm(onSaved);

    const titleInput = screen.getByDisplayValue('Original Title');
    fireEvent.change(titleInput, { target: { value: 'New Course Title' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'c1',
        input: expect.objectContaining({ title: 'New Course Title' }),
      })
    );
  });

  it('calls onSaved with success message after successful mutation', async () => {
    const onSaved = vi.fn();
    renderForm(onSaved);

    fireEvent.change(screen.getByDisplayValue('Original Title'), {
      target: { value: 'Updated' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    });

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith('Course info saved!');
    });
  });

  it('calls onSaved with error message when mutation fails', async () => {
    mockExecute.mockResolvedValue({
      data: undefined,
      error: {
        graphQLErrors: [{ message: 'Unauthorized' }],
        message: 'Unauthorized',
      },
    });
    const onSaved = vi.fn();
    renderForm(onSaved);

    fireEvent.change(screen.getByDisplayValue('Original Title'), {
      target: { value: 'Updated' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    });

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(
        expect.stringContaining('Unauthorized')
      );
    });
  });

  it('shows spinner while mutation is in flight', () => {
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: true },
      mockExecute,
    ] as never);
    renderForm();
    // Button exists but is disabled during fetch
    const btn = screen.getByRole('button', { name: /save changes/i });
    expect(btn).toBeDisabled();
  });
});
