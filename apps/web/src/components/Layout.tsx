import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/UserMenu';
import {
  BookOpen,
  Users,
  FileText,
  Bot,
  Network,
  GitBranch,
  Search,
  Menu,
  X,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

// Nav items visible to all authenticated users
const NAV_ITEMS = [
  { to: '/learn/content-1', icon: BookOpen, label: 'Learn' },
  { to: '/courses', icon: BookOpen, label: 'Courses' },
  { to: '/graph', icon: Network, label: 'Graph' },
  { to: '/annotations', icon: FileText, label: 'Annotations' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/collaboration', icon: Users, label: 'Chavruta' },
  { to: '/dashboard', icon: GitBranch, label: 'Dashboard' },
] as const;

// Admin-only nav items (hidden from STUDENT role)
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR']);

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const user = getCurrentUser();

  // Global keyboard shortcut: Ctrl+K / Cmd+K → open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const isAdmin = user ? ADMIN_ROLES.has(user.role) : false;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo + Nav */}
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-2xl font-bold text-primary shrink-0">
                EduSphere
              </Link>
              <nav className="hidden md:flex space-x-1">
                {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
                    className={({ isActive }) =>
                      [
                        'flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                        <span className="sr-only">{isActive ? ' (current page)' : ''}</span>
                      </>
                    )}
                  </NavLink>
                ))}
                {/* Admin-only: show course creation entry point */}
                {isAdmin && (
                  <NavLink
                    to="/courses/new"
                    aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
                    className={({ isActive }) =>
                      [
                        'flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-primary hover:bg-primary/10',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <BookOpen className="h-4 w-4" />
                        <span>New Course</span>
                        <span className="sr-only">{isActive ? ' (current page)' : ''}</span>
                      </>
                    )}
                  </NavLink>
                )}
              </nav>
            </div>

            {/* Right side: Search + User + Mobile hamburger */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex items-center gap-2 text-muted-foreground text-sm w-44 justify-start"
                onClick={() => navigate('/search')}
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search...</span>
                <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded border">⌘K</kbd>
              </Button>

              {user ? (
                <UserMenu user={user} />
              ) : (
                <Button size="sm" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
              )}

              {/* Hamburger button — visible on mobile only */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden p-2"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMobileMenuOpen((prev) => !prev)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile dropdown nav panel — visible below md breakpoint only */}
          {mobileMenuOpen && (
            <nav className="md:hidden border-t pt-2 pb-3 flex flex-col space-y-1">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/courses/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>New Course</span>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mx-3 mt-1 flex items-center gap-2 text-muted-foreground text-sm justify-start"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/search');
                }}
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search...</span>
              </Button>
            </nav>
          )}
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
