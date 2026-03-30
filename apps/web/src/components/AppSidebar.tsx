import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useBranding } from '@/contexts/BrandingContext';
import { getCurrentUser } from '@/lib/auth';
import { NAV_GROUPS, SIDEBAR_KEY } from './SidebarNavGroups';
import { SidebarFooter } from './SidebarFooter';

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
  const userRole = user?.role ?? 'STUDENT';

  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.filter(
        (group) => !group.allowedRoles || group.allowedRoles.has(userRole)
      ),
    [userRole]
  );

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', collapsed ? '64px' : '240px');
  }, [collapsed]);

  return (
    <aside
      data-testid="app-sidebar"
      className={[
        'fixed top-0 start-0 h-screen z-30 flex flex-col',
        'bg-card border-e border-border',
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
          onError={(e) => {
            const img = e.currentTarget;
            img.style.display = 'none';
            const fallback = img.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div
          className="h-7 w-7 shrink-0 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold"
          aria-hidden
          style={{ display: 'none' }}
          data-testid="sidebar-logo-fallback"
        >
          {(branding.organizationName?.[0] ?? 'E').toUpperCase()}
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-foreground truncate" data-testid="sidebar-brand-name">
            {branding.organizationName}
          </span>
        )}
      </div>

      {/* Main nav -- grouped by role */}
      <nav id="main-nav" className="flex-1 overflow-y-auto py-2" aria-label="Main navigation">
        {visibleGroups.map((group, groupIdx) => (
          <div key={group.key} data-testid={`nav-group-${group.key}`}>
            {groupIdx > 0 && <hr className="border-border mx-4 my-2" />}
            {!collapsed && (
              <p
                className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider px-5 pt-2 pb-1"
                data-testid={`nav-group-heading-${group.key}`}
              >
                {t(group.headingKey)}
              </p>
            )}
            {group.items.map(({ to, icon: Icon, labelKey }) => {
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
                      ? 'bg-primary/10 text-primary font-semibold border-s-2 border-primary'
                      : 'text-muted-foreground border-s-2 border-transparent',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <hr className="border-border mx-4" />

      <SidebarFooter
        collapsed={collapsed}
        resolvedMode={resolvedMode}
        user={user}
        hideEduSphereBranding={!!branding.hideEduSphereBranding}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        onToggleTheme={() => setThemeMode(resolvedMode === 'dark' ? 'light' : 'dark')}
      />
    </aside>
  );
}
