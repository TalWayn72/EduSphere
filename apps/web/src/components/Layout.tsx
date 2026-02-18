import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  LogOut,
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

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-2xl font-bold text-primary">
                EduSphere
              </Link>
              <nav className="hidden md:flex space-x-6">
                <Link
                  to="/learn/content-1"
                  className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Learn</span>
                </Link>
                <Link
                  to="/courses"
                  className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Courses</span>
                </Link>
                <Link
                  to="/graph"
                  className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <Network className="h-4 w-4" />
                  <span>Graph</span>
                </Link>
                <Link
                  to="/annotations"
                  className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <FileText className="h-4 w-4" />
                  <span>Annotations</span>
                </Link>
                <Link
                  to="/agents"
                  className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <Bot className="h-4 w-4" />
                  <span>Agents</span>
                </Link>
                <Link
                  to="/collaboration"
                  className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <Users className="h-4 w-4" />
                  <span>Chavruta</span>
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <GitBranch className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex items-center gap-2 text-muted-foreground text-sm w-48 justify-start"
                onClick={() => navigate('/search')}
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search...</span>
                <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded border">⌘K</kbd>
              </Button>
              {user && (
                <div className="text-sm text-muted-foreground hidden lg:block">
                  {user.firstName} {user.lastName}
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
