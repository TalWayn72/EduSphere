import React, { useEffect, useState, useMemo } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/UserMenu';
import { NotificationBell } from '@/components/NotificationBell';
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
  ShieldCheck,
  Link2,
  LayoutDashboard,
  Award,
  Brain,
} from 'lucide-react';
import { useSrsQueueCount } from '@/hooks/useSrsQueueCount';

interface LayoutProps {
  children: React.ReactNode;
}

// Admin-only nav items (hidden from STUDENT role)
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR']);
// Compliance nav: only ORG_ADMIN and SUPER_ADMIN (F-016)
const COMPLIANCE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN']);

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { t } = useTranslation('nav');

  const navItems = useMemo(
    () => [
      { to: '/learn/content-1', icon: BookOpen, label: t('learn') },
      { to: '/courses', icon: BookOpen, label: t('courses') },
      { to: '/graph', icon: Network, label: t('graph') },
      { to: '/annotations', icon: FileText, label: t('annotations') },
      { to: '/agents', icon: Bot, label: t('agents') },
      { to: '/my-badges', icon: Award, label: t('myBadges') },
      { to: '/collaboration', icon: Users, label: t('chavruta') },
      { to: '/dashboard', icon: GitBranch, label: t('dashboard') },
    ],
    [t]
  );

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
  const isComplianceAdmin = user ? COMPLIANCE_ROLES.has(user.role) : false;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const srsCount = useSrsQueueCount(!user);

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
                {navItems.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
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
                        <span className="sr-only">
                          {isActive ? ' (current page)' : ''}
                        </span>
                      </>
                    )}
                  </NavLink>
                ))}
                {/* SRS review link — visible to all logged-in users, shows due count badge */}
                {user && (
                  <NavLink
                    to="/srs-review"
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
                        <Brain className="h-4 w-4" />
                        <span>SRS</span>
                        {srsCount > 0 && (
                          <span className="ml-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                            {srsCount > 99 ? '99+' : srsCount}
                          </span>
                        )}
                        <span className="sr-only">{isActive ? ' (current page)' : ''}</span>
                      </>
                    )}
                  </NavLink>
                )}
                {/* Admin-only: show course creation entry point */}
                {isAdmin && (
                  <NavLink
                    to="/courses/new"
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
                        <span>{t('newCourse')}</span>
                        <span className="sr-only">
                          {isActive ? ' (current page)' : ''}
                        </span>
                      </>
                    )}
                  </NavLink>
                )}
                {/* Admin Panel: ORG_ADMIN / SUPER_ADMIN - appears before LTI */}
                {isComplianceAdmin && (
                  <NavLink
                    to="/admin"
                    end
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
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Admin Panel</span>
                        <span className="sr-only">
                          {isActive ? ' (current page)' : ''}
                        </span>
                      </>
                    )}
                  </NavLink>
                )}
                {/* LTI 1.3: ORG_ADMIN / SUPER_ADMIN only (F-018) */}
                {isComplianceAdmin && (
                  <NavLink
                    to="/admin/lti"
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
                        <Link2 className="h-4 w-4" />
                        <span>LTI 1.3</span>
                        <span className="sr-only">
                          {isActive ? ' (current page)' : ''}
                        </span>
                      </>
                    )}
                  </NavLink>
                )}
                {/* Compliance: ORG_ADMIN / SUPER_ADMIN only (F-016) */}
                {isComplianceAdmin && (
                  <NavLink
                    to="/admin/compliance"
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
                        <ShieldCheck className="h-4 w-4" />
                        <span>Compliance</span>
                        <span className="sr-only">
                          {isActive ? ' (current page)' : ''}
                        </span>
                      </>
                    )}
                  </NavLink>
                )}
                {isComplianceAdmin && (
                  <NavLink
                    to="/admin/scim"
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
                        <ShieldCheck className="h-4 w-4" />
                        <span>SCIM / HRIS</span>
                        <span className="sr-only">
                          {isActive ? ' (current page)' : ''}
                        </span>
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
                <span>{t('search')}</span>
                <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded border">
                  ⌘K
                </kbd>
              </Button>

              {user && <NotificationBell />}

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
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile dropdown nav panel — visible below md breakpoint only */}
          {mobileMenuOpen && (
            <nav className="md:hidden border-t pt-2 pb-3 flex flex-col space-y-1">
              {navItems.map(({ to, icon: Icon, label }) => (
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
              {/* SRS review — mobile */}
              {user && (
                <Link
                  to="/srs-review"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Brain className="h-4 w-4" />
                  <span>SRS</span>
                  {srsCount > 0 && (
                    <span className="ml-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {srsCount > 99 ? '99+' : srsCount}
                    </span>
                  )}
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/courses/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>{t('newCourse')}</span>
                </Link>
              )}
              {/* Admin Panel - mobile */}
              {isComplianceAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Admin Panel</span>
                </Link>
              )}
              {isComplianceAdmin && (
                <Link
                  to="/admin/lti"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Link2 className="h-4 w-4" />
                  <span>LTI 1.3</span>
                </Link>
              )}
              {isComplianceAdmin && (
                <Link
                  to="/admin/compliance"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Compliance</span>
                </Link>
              )}
              {isComplianceAdmin && (
                <Link
                  to="/admin/scim"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>SCIM / HRIS</span>
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
                <span>{t('search')}</span>
              </Button>
            </nav>
          )}
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
