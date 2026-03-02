import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Login } from './Login';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockIsAuthenticated = vi.fn().mockReturnValue(false);
const mockLogin = vi.fn();
vi.mock('@/lib/auth', () => ({
  isAuthenticated: () => mockIsAuthenticated(),
  login: () => mockLogin(),
  // DEV_MODE=false → render the production Keycloak branch so existing tests pass
  DEV_MODE: false,
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(false);
  });

  it('renders the welcome heading', () => {
    renderLogin();
    expect(screen.getByText('Welcome to EduSphere')).toBeInTheDocument();
  });

  it('renders the platform description', () => {
    renderLogin();
    expect(
      screen.getByText('Knowledge Graph Educational Platform')
    ).toBeInTheDocument();
  });

  it('renders the Sign In button', () => {
    renderLogin();
    expect(
      screen.getByRole('button', { name: /sign in with keycloak/i })
    ).toBeInTheDocument();
  });

  it('renders the sign-in description text', () => {
    renderLogin();
    expect(
      screen.getByText(/sign in with your organizational account/i)
    ).toBeInTheDocument();
  });

  it('calls login() when Sign In button is clicked', () => {
    renderLogin();
    fireEvent.click(
      screen.getByRole('button', { name: /sign in with keycloak/i })
    );
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('redirects to /dashboard when already authenticated', () => {
    mockIsAuthenticated.mockReturnValue(true);
    renderLogin();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('does not redirect when not authenticated', () => {
    mockIsAuthenticated.mockReturnValue(false);
    renderLogin();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders a BookOpen icon (svg)', () => {
    const { container } = renderLogin();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
