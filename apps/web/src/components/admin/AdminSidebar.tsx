/**
 * AdminSidebar — Left navigation sidebar for all admin pages.
 * Uses NavLink for active state detection.
 */
import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Palette,
  Languages,
  Globe,
  Megaphone,
  Users,
  ShieldCheck,
  BookOpen,
  ClipboardCheck,
  Award,
  Star,
  AlertTriangle,
  Trophy,
  Link2,
  Server,
  Building2,
  Activity,
  BarChart3,
  Lock,
  ScrollText,
  Bell,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

interface NavGroup {
  key: string;
  heading: string;
  items: NavItem[];
}

const linkBase =
  'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors';
const activeClass = `${linkBase} bg-primary/10 text-primary font-medium`;
const inactiveClass = `${linkBase} text-muted-foreground hover:text-foreground hover:bg-accent`;

export function AdminSidebar() {
  const { t } = useTranslation('admin');

  const navGroups = useMemo(
    (): NavGroup[] => [
      {
        key: 'overview',
        heading: t('sidebar.groups.overview'),
        items: [
          {
            to: '/admin',
            icon: LayoutDashboard,
            label: t('sidebar.nav.dashboard'),
          },
        ],
      },
      {
        key: 'organization',
        heading: t('sidebar.groups.organization'),
        items: [
          {
            to: '/admin/branding',
            icon: Palette,
            label: t('sidebar.nav.branding'),
          },
          {
            to: '/admin/languages',
            icon: Languages,
            label: t('sidebar.nav.languages'),
          },
          {
            to: '/admin/portal',
            icon: Globe,
            label: t('sidebar.nav.portalBuilder'),
          },
          {
            to: '/admin/announcements',
            icon: Megaphone,
            label: t('sidebar.nav.announcements'),
          },
        ],
      },
      {
        key: 'people',
        heading: t('sidebar.groups.people'),
        items: [
          { to: '/admin/users', icon: Users, label: t('sidebar.nav.users') },
          {
            to: '/admin/roles',
            icon: ShieldCheck,
            label: t('sidebar.nav.rolesPermissions'),
          },
        ],
      },
      {
        key: 'learning',
        heading: t('sidebar.groups.learning'),
        items: [
          {
            to: '/admin/enrollment',
            icon: BookOpen,
            label: t('sidebar.nav.enrollment'),
          },
          {
            to: '/admin/compliance',
            icon: ClipboardCheck,
            label: t('sidebar.nav.compliance'),
          },
          { to: '/admin/cpd', icon: Award, label: t('sidebar.nav.cpd') },
          {
            to: '/admin/assessments',
            icon: Star,
            label: t('sidebar.nav.assessments'),
          },
          {
            to: '/admin/at-risk',
            icon: AlertTriangle,
            label: t('sidebar.nav.atRiskLearners'),
          },
          {
            to: '/admin/gamification',
            icon: Trophy,
            label: t('sidebar.nav.gamification'),
          },
        ],
      },
      {
        key: 'integrations',
        heading: t('sidebar.groups.integrations'),
        items: [
          { to: '/admin/lti', icon: Link2, label: t('sidebar.nav.lti') },
          { to: '/admin/scim', icon: Server, label: t('sidebar.nav.scimHris') },
          {
            to: '/admin/crm',
            icon: Building2,
            label: t('sidebar.nav.crmSalesforce'),
          },
          {
            to: '/admin/xapi',
            icon: Activity,
            label: t('sidebar.nav.xapiLrs'),
          },
          {
            to: '/admin/bi-export',
            icon: BarChart3,
            label: t('sidebar.nav.biExport'),
          },
        ],
      },
      {
        key: 'security-compliance',
        heading: t('sidebar.groups.securityCompliance'),
        items: [
          {
            to: '/admin/security',
            icon: Lock,
            label: t('sidebar.nav.securitySettings'),
          },
          {
            to: '/admin/audit',
            icon: ScrollText,
            label: t('sidebar.nav.auditLog'),
          },
        ],
      },
      {
        key: 'settings',
        heading: t('sidebar.groups.settings'),
        items: [
          {
            to: '/admin/notifications',
            icon: Bell,
            label: t('sidebar.nav.notificationTemplates'),
          },
        ],
      },
    ],
    [t]
  );

  return (
    <aside className="w-56 shrink-0 sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto border-r pr-2">
      <nav>
        {navGroups.map((group) => (
          <div key={group.key}>
            <p className="text-xs font-semibold text-muted-foreground px-3 py-1 mt-4 first:mt-0 uppercase tracking-wider">
              {group.heading}
            </p>
            {group.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin'}
                className={({ isActive }) =>
                  isActive ? activeClass : inactiveClass
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
