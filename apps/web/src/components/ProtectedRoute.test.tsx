import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  isAuthenticated: vi.fn(),
}));

import { ProtectedRoute } from './ProtectedRoute';
import { isAuthenticated } from '@/lib/auth';

function renderWithRouter(authenticated: boolean) {
  vi.mocked(isAuthenticated).mockReturnValue(authenticated);
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div data-testid="protected-content">Secret</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when authenticated', () => {
    renderWithRouter(true);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    renderWithRouter(false);
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });
});
