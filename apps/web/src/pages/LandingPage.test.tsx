import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';

// Mock react-router-dom Link so it renders as <a>
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode; [k: string]: unknown }) => (
      <a href={to as string} {...rest}>{children}</a>
    ),
  };
});

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
}

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the hero section with main headline', () => {
    renderLanding();
    expect(screen.getByTestId('hero-section')).toBeInTheDocument();
    expect(
      screen.getByText(/The AI-Powered Learning Platform Built for the Future/i)
    ).toBeInTheDocument();
  });

  it('renders the hero sub-headline', () => {
    renderLanding();
    expect(
      screen.getByText(/Personalized learning paths, knowledge graphs/i)
    ).toBeInTheDocument();
  });

  it('renders hero CTA buttons', () => {
    renderLanding();
    expect(screen.getByRole('link', { name: /Get Started Free/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Watch Demo/i })).toBeInTheDocument();
  });

  it('renders the stats bar with stat labels', () => {
    renderLanding();
    expect(screen.getByTestId('stats-bar')).toBeInTheDocument();
    // Labels are static — values are animated (AnimatedCounter) and may render
    // as 0 initially in jsdom before requestAnimationFrame completes.
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Learners')).toBeInTheDocument();
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('Languages')).toBeInTheDocument();
  });

  it('renders all 6 feature cards', () => {
    renderLanding();
    const section = screen.getByTestId('features-section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveTextContent('AI Tutoring');
    // There's also a footer link named "Knowledge Graph" — check within features section
    expect(section.querySelectorAll('h3').length).toBeGreaterThanOrEqual(6);
    const headings = Array.from(section.querySelectorAll('h3')).map((h) => h.textContent);
    expect(headings).toContain('Knowledge Graph');
    expect(headings).toContain('Gamification');
    expect(headings).toContain('Enterprise Grade');
    expect(headings).toContain('Multi-language');
    expect(headings).toContain('Live Sessions');
  });

  it('renders how it works section with 3 steps', () => {
    renderLanding();
    expect(screen.getByTestId('how-it-works-section')).toBeInTheDocument();
    expect(screen.getByText(/Sign Up & Set Goals/i)).toBeInTheDocument();
    expect(screen.getByText(/Learn at Your Pace/i)).toBeInTheDocument();
    expect(screen.getByText(/Track Mastery/i)).toBeInTheDocument();
  });

  it('renders the testimonials section with 3 testimonials', () => {
    renderLanding();
    const testimonialsSection = screen.getByTestId('testimonials-section');
    expect(testimonialsSection).toBeInTheDocument();
    // Use within() to scope queries — TestimonialsCarousel also contains some author names
    expect(within(testimonialsSection).getByText('Sarah Chen')).toBeInTheDocument();
    expect(within(testimonialsSection).getByText('Marcus Rivera')).toBeInTheDocument();
    expect(within(testimonialsSection).getByText('Dr. Aisha Patel')).toBeInTheDocument();
  });

  it('renders 3 pricing tiers', () => {
    renderLanding();
    expect(screen.getByTestId('pricing-section')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('renders the CTA banner', () => {
    renderLanding();
    expect(screen.getByTestId('cta-banner')).toBeInTheDocument();
    expect(screen.getByText(/Ready to Transform Your Learning/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start Free Today/i })).toBeInTheDocument();
  });

  it('renders the footer with copyright 2026', () => {
    renderLanding();
    expect(screen.getByTestId('landing-footer')).toBeInTheDocument();
    expect(screen.getByText(/© 2026 EduSphere/i)).toBeInTheDocument();
  });

  it('renders navigation header with all data-testid', () => {
    renderLanding();
    const nav = screen.getByTestId('landing-nav');
    expect(nav).toBeInTheDocument();
    // Use getAllBy for links that appear in both desktop nav and mobile nav
    expect(screen.getAllByRole('link', { name: /Log In/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: /Get Started/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('mobile nav toggle opens and closes the menu', () => {
    renderLanding();
    const toggle = screen.getByRole('button', { name: /Open menu/i });
    expect(toggle).toBeInTheDocument();

    // Menu hidden initially on desktop; fireEvent opens it
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /Close menu/i })).toBeInTheDocument();

    // Close it
    fireEvent.click(screen.getByRole('button', { name: /Close menu/i }));
    expect(screen.getByRole('button', { name: /Open menu/i })).toBeInTheDocument();
  });

  it('does not show raw technical strings or error messages', () => {
    renderLanding();
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/undefined/i);
    expect(body).not.toMatch(/TypeError/i);
    expect(body).not.toMatch(/stack trace/i);
    expect(body).not.toMatch(/Cannot read/i);
    expect(body).not.toMatch(/\[object Object\]/);
  });

  it('all required data-testid attributes are present', () => {
    renderLanding();
    const ids = [
      'hero-section',
      'stats-bar',
      'features-section',
      'how-it-works-section',
      'testimonials-section',
      'pricing-section',
      'cta-banner',
      'landing-footer',
      'landing-nav',
    ];
    for (const id of ids) {
      expect(screen.getByTestId(id), `Missing data-testid="${id}"`).toBeInTheDocument();
    }
  });
});
