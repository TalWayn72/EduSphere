import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Compass,
  Network,
  Bot,
  Video,
  Settings,
  Sun,
  Moon,
  Brain,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getCurrentUser } from '@/lib/auth';

const SIDEBAR_KEY = 'edusphere-sidebar-collapsed';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/courses', icon: BookOpen, label: 'My Courses' },
  { to: '/explore', icon: Compass, label: 'Discover' },
  { to: '/knowledge-graph', icon: Network, label: 'Knowledge Graph' },
  { to: '/agents', icon: Bot, label: 'AI Tutor' },
  { to: '/sessions', icon: Video, label: 'Live Sessions' },
];

function getInitials(firstName?: string, lastName?: string, username?: string): string {
  const f = firstName?.[0] ?? '';
  const l = lastName?.[0] ?? '';
  return (f + l).toUpperCase() || (username?.[0] ?? 'U').toUpperCase();
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const location = useLocation();
  const { resolvedMode, setThemeMode } = useTheme();
  const user = getCurrentUser();

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  const toggleTheme = () => {
    setThemeMode(resolvedMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside
      data-testid="app-sidebar"
      className={[
        'fixed top-0 left-0 h-screen z-30 flex flex-col',
        'bg-card border-r border-border',
        'transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      ].join(' ')}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 py-5 shrink-0">
        <Brain
          className="h-7 w-7 text-primary shrink-0"
          data-testid="sidebar-logo-icon"
          aria-hidden
        />
        {!collapsed && (
          <span className="text-lg font-bold text-foreground truncate" data-testid="sidebar-brand-name">
            EduSphere
          </span>
        )}
      </div>

      {/* Main nav */}
      <nav id="main-nav" className="flex-1 overflow-y-auto py-2" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              data-testid={`nav-item-${label.toLowerCase().replace(/\s+/g, '-')}`}
              className={[
                'flex items-center gap-3 rounded-lg mx-2 px-3 py-2 text-sm font-medium',
                'transition-colors hover:bg-muted/60',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary'
                  : 'text-muted-foreground border-l-2 border-transparent',
              ].join(' ')}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Divider */}
      <hr className="border-border mx-4" />

      {/* Bottom section */}
      <div className="py-3 flex flex-col gap-1">
        {/* Settings */}
        <NavLink
          to="/settings"
          title={collapsed ? 'Settings' : undefined}
          data-testid="nav-item-settings"
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-lg mx-2 px-3 py-2 text-sm font-medium',
              'transition-colors hover:bg-muted/60',
              isActive
                ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary'
                : 'text-muted-foreground border-l-2 border-transparent',
            ].join(' ')
          }
        >
          <Settings className="h-4 w-4 shrink-0" aria-hidden />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={resolvedMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          data-testid="theme-toggle"
          className="flex items-center gap-3 rounded-lg mx-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 transition-colors border-l-2 border-transparent"
          aria-label={resolvedMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {resolvedMode === 'dark' ? (
            <Sun className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <Moon className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {!collapsed && (
            <span>{resolvedMode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          )}
        </button>

        {/* User avatar */}
        {user && (
          <div
            className="flex items-center gap-3 rounded-lg mx-2 px-3 py-2"
            data-testid="sidebar-user"
            title={collapsed ? `${user.firstName} ${user.lastName}` : undefined}
          >
            <div
              className="h-7 w-7 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold"
              aria-hidden
            >
              {getInitials(user.firstName, user.lastName, user.username)}
            </div>
            {!collapsed && (
              <span className="text-xs font-medium text-foreground truncate" data-testid="sidebar-user-name">
                {user.firstName || user.username}
              </span>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapsed}
          data-testid="sidebar-collapse-toggle"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center gap-3 rounded-lg mx-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60 transition-colors border-l-2 border-transparent"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
