import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Trophy,
  BarChart2,
  Award,
  FileQuestion,
  Target,
  MessageSquare,
  Users,
  Search,
  Star,
  ClipboardList,
  Swords,
  UserCheck,
  Lightbulb,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useBranding } from '@/contexts/BrandingContext';
import { getCurrentUser } from '@/lib/auth';

const MANAGER_SIDEBAR_ROLES = new Set(['MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN']);
const QUIZ_BUILDER_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);

const SIDEBAR_KEY = 'edusphere-sidebar-collapsed';

interface NavItem {
  to: string;
  icon: React.ElementType;
  labelKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'home' },
  { to: '/courses', icon: BookOpen, labelKey: 'myCourses' },
  { to: '/explore', icon: Compass, labelKey: 'discover' },
  { to: '/knowledge-graph', icon: Network, labelKey: 'knowledgeGraph' },
  { to: '/agents', icon: Bot, labelKey: 'aiTutor' },
  { to: '/sessions', icon: Video, labelKey: 'liveSessions' },
  { to: '/gamification', icon: Trophy, labelKey: 'gamification' },
  { to: '/certificates', icon: Award, labelKey: 'certificates' },
  { to: '/srs-review', icon: Brain, labelKey: 'srsReview' },
  { to: '/skills', icon: Target, labelKey: 'skillPaths' },
  { to: '/discussions', icon: MessageSquare, labelKey: 'discussions' },
  { to: '/social', icon: Users, labelKey: 'socialFeed' },
  { to: '/people', icon: Search, labelKey: 'findPeople' },
  { to: '/peer-review', icon: Star, labelKey: 'peerReview' },
  { to: '/assessments', icon: ClipboardList, labelKey: 'assessments' },
  { to: '/challenges', icon: Swords, labelKey: 'groupChallenges' },
  { to: '/peer-matching', icon: UserCheck, labelKey: 'peerMatching' },
  { to: '/cohort-insights', icon: Lightbulb, labelKey: 'cohortInsights' },
];

function getInitials(firstName?: string, lastName?: string, username?: string): string {
  const f = firstName?.[0] ?? '';
  const l = lastName?.[0] ?? '';
  return (f + l).toUpperCase() || (username?.[0] ?? 'U').toUpperCase();
}

export function AppSidebar() {
  const { t } = useTranslation('nav');
  const { branding } = useBranding();
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
        <img
          src={collapsed ? (branding.logoMarkUrl ?? branding.logoUrl) : branding.logoUrl}
          alt={branding.organizationName}
          className="h-7 w-7 shrink-0 object-contain"
          data-testid="sidebar-logo-icon"
          aria-hidden
        />
        {!collapsed && (
          <span className="text-lg font-bold text-foreground truncate" data-testid="sidebar-brand-name">
            {branding.organizationName}
          </span>
        )}
      </div>

      {/* Main nav */}
      <nav id="main-nav" className="flex-1 overflow-y-auto py-2" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => {
          const label = t(labelKey);
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              data-testid={`nav-item-${labelKey}`}
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

        {/* Manager Dashboard — visible to MANAGER / ORG_ADMIN / SUPER_ADMIN */}
        {user?.role && MANAGER_SIDEBAR_ROLES.has(user.role) && (
          <NavLink
            to="/manager"
            title={collapsed ? 'Manager Dashboard' : undefined}
            data-testid="nav-item-managerDashboard"
            className={[
              'flex items-center gap-3 rounded-lg mx-2 px-3 py-2 text-sm font-medium',
              'transition-colors hover:bg-muted/60',
              location.pathname === '/manager'
                ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary'
                : 'text-muted-foreground border-l-2 border-transparent',
            ].join(' ')}
          >
            <BarChart2 className="h-4 w-4 shrink-0" aria-hidden />
            {!collapsed && <span className="truncate">Manager Dashboard</span>}
          </NavLink>
        )}

        {/* Quiz Builder — visible to INSTRUCTOR / ORG_ADMIN / SUPER_ADMIN */}
        {user?.role && QUIZ_BUILDER_ROLES.has(user.role) && (
          <NavLink
            to="/quiz-builder"
            title={collapsed ? t('quizBuilder') : undefined}
            data-testid="nav-item-quizBuilder"
            className={[
              'flex items-center gap-3 rounded-lg mx-2 px-3 py-2 text-sm font-medium',
              'transition-colors hover:bg-muted/60',
              location.pathname === '/quiz-builder'
                ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary'
                : 'text-muted-foreground border-l-2 border-transparent',
            ].join(' ')}
          >
            <FileQuestion className="h-4 w-4 shrink-0" aria-hidden />
            {!collapsed && <span className="truncate">{t('quizBuilder')}</span>}
          </NavLink>
        )}
      </nav>

      {/* Divider */}
      <hr className="border-border mx-4" />

      {/* Bottom section */}
      <div className="py-3 flex flex-col gap-1">
        {/* Settings */}
        <NavLink
          to="/settings"
          title={collapsed ? t('settings') : undefined}
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
          {!collapsed && <span>{t('settings')}</span>}
        </NavLink>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={resolvedMode === 'dark' ? t('switchToLight') : t('switchToDark')}
          data-testid="theme-toggle"
          className="flex items-center gap-3 rounded-lg mx-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 transition-colors border-l-2 border-transparent"
          aria-label={resolvedMode === 'dark' ? t('switchToLight') : t('switchToDark')}
        >
          {resolvedMode === 'dark' ? (
            <Sun className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <Moon className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {!collapsed && (
            <span>{resolvedMode === 'dark' ? t('lightMode') : t('darkMode')}</span>
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

        {/* Powered-by footer — hidden when white-label branding suppresses it */}
        {!branding.hideEduSphereBranding && !collapsed && (
          <div className="mx-2 px-3 py-1" data-testid="powered-by-edusphere">
            <span className="text-xs text-muted-foreground/60">Powered by EduSphere</span>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapsed}
          data-testid="sidebar-collapse-toggle"
          aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
          className="flex items-center gap-3 rounded-lg mx-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60 transition-colors border-l-2 border-transparent"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              <span>{t('collapse')}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
