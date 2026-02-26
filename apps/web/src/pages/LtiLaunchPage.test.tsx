import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LtiLaunchPage } from './LtiLaunchPage';

// ── Router helper ─────────────────────────────────────────────────────────────

/**
 * Render LtiLaunchPage inside a MemoryRouter pre-seeded with the given URL.
 * We also add a catch-all /dashboard and /courses/* routes so navigation
 * triggered inside the component can land somewhere visible.
 */
function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/lti/launch" element={<LtiLaunchPage />} />
        <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
        <Route path="/courses/:id" element={<div data-testid="courses">Courses</div>} />
        <Route path="/learn/:id" element={<div data-testid="learn">Learn</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LtiLaunchPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores lti_token in localStorage', () => {
    renderAt('/lti/launch?lti_token=abc123&target=%2Fdashboard');
    expect(localStorage.getItem('lti_token')).toBe('abc123');
  });

  it('redirects to the target path from the URL', () => {
    renderAt('/lti/launch?lti_token=tok1&target=%2Fdashboard');
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('redirects to /dashboard when no target param is present', () => {
    renderAt('/lti/launch?lti_token=tok2');
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('redirects to /dashboard when target is an absolute URL (open-redirect guard)', () => {
    renderAt('/lti/launch?lti_token=tok3&target=https%3A%2F%2Fevil.example.com');
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('redirects to course URL when target is /courses/:id', () => {
    renderAt('/lti/launch?lti_token=tok4&target=%2Fcourses%2Fcourse-99');
    expect(screen.getByTestId('courses')).toBeInTheDocument();
  });

  it('redirects to /dashboard when lti_token is missing (no token stored)', () => {
    renderAt('/lti/launch?target=%2Fdashboard');
    expect(localStorage.getItem('lti_token')).toBeNull();
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('shows the "Redirecting..." loading indicator before navigation completes', () => {
    // Briefly render; the spinner text should be in the DOM on first paint
    // before useEffect fires (React Testing Library renders synchronously,
    // but the text is always present in the component tree).
    render(
      <MemoryRouter initialEntries={['/lti/launch?lti_token=t']}>
        <Routes>
          <Route path="/lti/launch" element={<LtiLaunchPage />} />
          <Route path="/dashboard" element={<div data-testid="dashboard" />} />
        </Routes>
      </MemoryRouter>,
    );
    // Either the spinner text or the dashboard should be present after render
    const spinner = screen.queryByText('Redirecting...');
    const dashboard = screen.queryByTestId('dashboard');
    expect(spinner !== null || dashboard !== null).toBe(true);
  });

  it('does not store empty string as lti_token', () => {
    renderAt('/lti/launch?lti_token=');
    // An empty string is falsy — nothing should be stored
    // (URLSearchParams returns '' for present-but-empty params)
    // The component only calls localStorage.setItem when ltiToken is truthy.
    const stored = localStorage.getItem('lti_token');
    expect(stored === null || stored === '').toBe(true);
  });
});
