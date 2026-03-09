import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as urql from 'urql';
import { AssessmentResponsePage } from './AssessmentResponsePage';

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('urql', async () => ({
  ...(await vi.importActual('urql')),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

const NOOP_MUTATION = [
  { fetching: false },
  vi.fn().mockResolvedValue({ data: undefined, error: undefined }),
] as never;

function renderWithRoute() {
  return render(
    <MemoryRouter initialEntries={['/assessments/c1/respond']}>
      <Routes>
        <Route path="/assessments/:id/respond" element={<AssessmentResponsePage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AssessmentResponsePage', () => {
  beforeEach(() => {
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  });

  it('renders narrative textarea', () => {
    renderWithRoute();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderWithRoute();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  it('renders role selector buttons', () => {
    renderWithRoute();
    expect(screen.getByText('SELF')).toBeInTheDocument();
    expect(screen.getByText('PEER')).toBeInTheDocument();
    expect(screen.getByText('MANAGER')).toBeInTheDocument();
    expect(screen.getByText(/DIRECT/i)).toBeInTheDocument();
  });

  it('does not show success message before submission', () => {
    renderWithRoute();
    expect(
      screen.queryByText(/your assessment has been submitted/i)
    ).not.toBeInTheDocument();
  });
});
