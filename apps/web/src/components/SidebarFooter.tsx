/**
 * SidebarFooter -- Bottom section of the sidebar: help, settings, theme, user, collapse.
 * Extracted from AppSidebar for file-size compliance.
 */
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { getInitials } from './SidebarNavGroups';

interface SidebarUser {
  firstName?: string;
  lastName?: string;
  username?: string;
  role?: string;
}

interface SidebarFooterProps {
  collapsed: boolean;
  resolvedMode: 'light' | 'dark';
  user: SidebarUser | null;
  hideEduSphereBranding: boolean;
  onToggleCollapse: () => void;
  onToggleTheme: () => void;
}

const navLinkClass = (isActive: boolean) =>
  [
    'flex items-center gap-3 rounded-lg mx-2 px-3 py-2 text-sm font-medium',
    'transition-colors hover:bg-muted/60',
    isActive
      ? 'bg-primary/10 text-primary font-semibold border-s-2 border-primary'
      : 'text-muted-foreground border-s-2 border-transparent',
  ].join(' ');

export function SidebarFooter({
  collapsed,
  resolvedMode,
  user,
  hideEduSphereBranding,
  onToggleCollapse,
  onToggleTheme,
}: SidebarFooterProps) {
  const { t } = useTranslation('nav');

  return (
    <div className="py-3 flex flex-col gap-1">
      <NavLink
        to="/help"
        title={collapsed ? t('helpAndSupport') : undefined}
        data-testid="nav-item-help"
        aria-label={t('helpAndSupport')}
        className={({ isActive }) => navLinkClass(isActive)}
      >
        <HelpCircle className="h-4 w-4 shrink-0" aria-hidden />
        {!collapsed && <span>{t('helpAndSupport')}</span>}
      </NavLink>

      <NavLink
        to="/settings"
        title={collapsed ? t('settings') : undefined}
        data-testid="nav-item-settings"
        className={({ isActive }) => navLinkClass(isActive)}
      >
        <Settings className="h-4 w-4 shrink-0" aria-hidden />
        {!collapsed && <span>{t('settings')}</span>}
      </NavLink>

      <button
        onClick={onToggleTheme}
        title={resolvedMode === 'dark' ? t('switchToLight') : t('switchToDark')}
        data-testid="theme-toggle"
        className="flex items-center gap-3 rounded-lg mx-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 transition-colors border-s-2 border-transparent"
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

      {!hideEduSphereBranding && !collapsed && (
        <div className="mx-2 px-3 py-1" data-testid="powered-by-edusphere">
          <span className="text-xs text-muted-foreground/60">{t('poweredBy')}</span>
        </div>
      )}

      <button
        onClick={onToggleCollapse}
        data-testid="sidebar-collapse-toggle"
        aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
        className="flex items-center gap-3 rounded-lg mx-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60 transition-colors border-s-2 border-transparent"
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
  );
}
