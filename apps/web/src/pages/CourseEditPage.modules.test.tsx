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
  CREATE_MODULE_MUTATION: 'CREATE_MODULE_MUTATION',
  UPDATE_MODULE_MUTATION: 'UPDATE_MODULE_MUTATION',
  DELETE_MODULE_MUTATION: 'DELETE_MODULE_MUTATION',
  REORDER_MODULES_MUTATION: 'REORDER_MODULES_MUTATION',
  CREATE_CONTENT_ITEM_MUTATION: 'CREATE_CONTENT_ITEM_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CourseEditModules } from './CourseEditPage.modules';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_MODULES = [
  {
    id: 'mod-1',
    title: 'Unit 1: Foundations',
    description: null,
    orderIndex: 0,
    contentItems: [
      { id: 'ci-1', title: 'Intro Video', contentType: 'VIDEO', orderIndex: 0 },
      { id: 'ci-2', title: 'Reading', contentType: 'PDF', orderIndex: 1 },
    ],
  },
  {
    id: 'mod-2',
    title: 'Unit 2: Advanced Topics',
    description: null,
    orderIndex: 1,
    contentItems: [],
  },
];

// Safe NOOP execute: resolves to { data: null, error: undefined } so destructuring never throws
const NOOP_EXECUTE = vi.fn();
const NOOP_MUTATION = [{ fetching: false }, NOOP_EXECUTE] as never;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CourseEditModules', () => {
  const onRefetch = vi.fn();
  const onToast = vi.fn();

  function renderModules(modules = MOCK_MODULES) {
    return render(
      <CourseEditModules
        courseId="course-1"
        modules={modules}
        onRefetch={onRefetch}
        onToast={onToast}
      />
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    // Safe default: execute functions resolve to { data: null, error: undefined }
    NOOP_EXECUTE.mockResolvedValue({ data: null, error: undefined });
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders module titles', () => {
    renderModules();
    expect(screen.getByText('Unit 1: Foundations')).toBeInTheDocument();
    expect(screen.getByText('Unit 2: Advanced Topics')).toBeInTheDocument();
  });

  it('shows content item count badge for each module', () => {
    renderModules();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByText('0 items')).toBeInTheDocument();
  });

  it('shows "Add Module" button when modules are present', () => {
    renderModules();
    expect(
      screen.getByRole('button', { name: /add module/i })
    ).toBeInTheDocument();
  });

  it('shows "Add Module" button even when modules list is empty', () => {
    renderModules([]);
    expect(
      screen.getByRole('button', { name: /add module/i })
    ).toBeInTheDocument();
  });

  it('first module has "Move module up" button disabled', () => {
    renderModules();
    const upButtons = screen.getAllByRole('button', {
      name: /move module up/i,
    });
    expect(upButtons[0]).toBeDisabled();
  });

  it('last module has "Move module down" button disabled', () => {
    renderModules();
    const downButtons = screen.getAllByRole('button', {
      name: /move module down/i,
    });
    expect(downButtons[downButtons.length - 1]).toBeDisabled();
  });

  it('clicking "Add Module" shows the new module form', () => {
    renderModules();
    fireEvent.click(screen.getByRole('button', { name: /add module/i }));
    expect(screen.getByPlaceholderText(/module title/i)).toBeInTheDocument();
  });

  it('"Create Module" button is disabled when title input is empty', () => {
    renderModules();
    fireEvent.click(screen.getByRole('button', { name: /add module/i }));
    expect(
      screen.getByRole('button', { name: /create module/i })
    ).toBeDisabled();
  });

  it('"Create Module" button enables when title is entered', () => {
    renderModules();
    fireEvent.click(screen.getByRole('button', { name: /add module/i }));
    fireEvent.change(screen.getByPlaceholderText(/module title/i), {
      target: { value: 'New Module' },
    });
    expect(
      screen.getByRole('button', { name: /create module/i })
    ).not.toBeDisabled();
  });

  it('clicking rename icon puts module into edit mode', () => {
    renderModules();
    const renameButtons = screen.getAllByRole('button', {
      name: /rename module/i,
    });
    fireEvent.click(renameButtons[0] as HTMLElement);
    // In edit mode, an input pre-filled with the module title appears
    expect(screen.getByDisplayValue('Unit 1: Foundations')).toBeInTheDocument();
  });

  it('calls DELETE_MODULE_MUTATION when delete is confirmed', async () => {
    const mockDelete = vi
      .fn()
      .mockResolvedValue({ data: { deleteModule: true }, error: undefined });
    // Use mockReturnValue so ALL useMutation calls return mockDelete across all renders
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      mockDelete,
    ] as never);

    renderModules();

    const deleteButtons = screen.getAllByRole('button', {
      name: /delete module/i,
    });
    await act(async () => {
      fireEvent.click(deleteButtons[0] as HTMLElement);
    });

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith({ id: 'mod-1' });
    });
  });

  it('calls CREATE_MODULE_MUTATION when creating a new module', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      data: {
        createModule: {
          id: 'mod-new',
          title: 'New Module',
          orderIndex: 2,
          contentItems: [],
        },
      },
      error: undefined,
    });
    // Use mockReturnValue so ALL useMutation calls return mockCreate across all renders
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      mockCreate,
    ] as never);

    renderModules();
    fireEvent.click(screen.getByRole('button', { name: /add module/i }));
    fireEvent.change(screen.getByPlaceholderText(/module title/i), {
      target: { value: 'New Module' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create module/i }));
    });

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            courseId: 'course-1',
            title: 'New Module',
          }),
        })
      );
    });
  });
});
