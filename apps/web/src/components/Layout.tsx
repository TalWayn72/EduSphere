import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/UserMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppSidebar } from '@/components/AppSidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { t } = useTranslation('nav');

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
    <div className="min-h-screen bg-background flex">
      {/* Fixed sidebar */}
      <AppSidebar />

      {/* Main content — offset left to account for sidebar (min-width: 64px collapsed) */}
      <div className="flex-1 flex flex-col ml-16 md:ml-16 transition-all duration-200" data-testid="layout-main">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border px-4 py-2.5 flex items-center justify-end gap-2" data-testid="topbar">
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
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 overflow-auto px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
