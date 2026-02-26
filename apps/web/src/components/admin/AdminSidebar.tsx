/**
 * AdminSidebar — Left navigation sidebar for all admin pages.
 * Uses NavLink for active state detection.
 */
import React from 'react';
import { NavLink } from 'react-router-dom';
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
  heading: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Overview',
    items: [{ to: '/admin', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    heading: 'Organization',
    items: [
      { to: '/admin/branding', icon: Palette, label: 'Branding' },
      { to: '/admin/languages', icon: Languages, label: 'Languages' },
      { to: '/admin/portal', icon: Globe, label: 'Portal Builder' },
      { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
    ],
  },
  {
    heading: 'People',
    items: [
      { to: '/admin/users', icon: Users, label: 'Users' },
      { to: '/admin/roles', icon: ShieldCheck, label: 'Roles & Permissions' },
    ],
  },
  {
    heading: 'Learning',
    items: [
      { to: '/admin/enrollment', icon: BookOpen, label: 'Enrollment' },
      { to: '/admin/compliance', icon: ClipboardCheck, label: 'Compliance' },
      { to: '/admin/cpd', icon: Award, label: 'CPD / Credits' },
      { to: '/admin/assessments', icon: Star, label: '360° Assessments' },
      { to: '/admin/at-risk', icon: AlertTriangle, label: 'At-Risk Learners' },
      { to: '/admin/gamification', icon: Trophy, label: 'Gamification' },
    ],
  },
  {
    heading: 'Integrations',
    items: [
      { to: '/admin/lti', icon: Link2, label: 'LTI 1.3' },
      { to: '/admin/scim', icon: Server, label: 'SCIM / HRIS' },
      { to: '/admin/crm', icon: Building2, label: 'CRM (Salesforce)' },
      { to: '/admin/xapi', icon: Activity, label: 'xAPI / LRS' },
      { to: '/admin/bi-export', icon: BarChart3, label: 'BI Export' },
    ],
  },
  {
    heading: 'Security & Compliance',
    items: [
      { to: '/admin/security', icon: Lock, label: 'Security Settings' },
      { to: '/admin/audit', icon: ScrollText, label: 'Audit Log' },
    ],
  },
  {
    heading: 'Settings',
    items: [
      {
        to: '/admin/notifications',
        icon: Bell,
        label: 'Notification Templates',
      },
    ],
  },
];

const linkBase =
  'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors';
const activeClass = `${linkBase} bg-primary/10 text-primary font-medium`;
const inactiveClass = `${linkBase} text-muted-foreground hover:text-foreground hover:bg-accent`;

export function AdminSidebar() {
  return (
    <aside className="w-56 shrink-0 sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto border-r pr-2">
      <nav>
        {NAV_GROUPS.map((group) => (
          <div key={group.heading}>
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
