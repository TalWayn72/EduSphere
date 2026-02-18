import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                ))}
                {/* Admin-only: show course creation entry point */}
                {isAdmin && (
                  <Link
                    to="/courses/new"
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>New Course</span>
                  </Link>
                )}
              </nav>
            </div>

            {/* Right side: Search + User */}
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
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
