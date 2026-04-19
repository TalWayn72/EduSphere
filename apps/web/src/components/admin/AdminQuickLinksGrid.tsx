/**
 * AdminQuickLinksGrid — full navigation grid for all admin routes.
 * Grouped by functional area so admins can reach every section from the dashboard.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  ShieldCheck,
  UserCog,
  KeyRound,
  Database,
  BookOpen,
  Globe,
  BookMarked,
  Trophy,
  ClipboardCheck,
  Layers,
  BarChart2,
  Activity,
  TrendingUp,
  FileDown,
  SearchX,
  AlertTriangle,
  Users2,
  Lock,
  ScrollText,
  FileText,
  CreditCard,
  Palette,
  Megaphone,
  Bell,
  Link2,
  Webhook,
  Server,
  BrainCircuit,
  Receipt,
  Gauge,
  ClipboardList,
  Rocket,
  Info,
  Edit3,
} from 'lucide-react';

interface QuickLink {
  to: string;
  icon: React.ElementType;
  label: string;
  desc: string;
}

interface LinkGroup {
  heading: string;
  links: QuickLink[];
}

const LINK_GROUPS: LinkGroup[] = [
  {
    heading: 'Users & Access',
    links: [
      {
        to: '/admin/users',
        icon: Users,
        label: 'User Management',
        desc: 'Manage learners and admins',
      },
      {
        to: '/admin/user-management',
        icon: UserCog,
        label: 'User Management (MVP)',
        desc: 'Advanced user controls',
      },
      {
        to: '/admin/roles',
        icon: ShieldCheck,
        label: 'Role Management',
        desc: 'Assign roles and permissions',
      },
      {
        to: '/admin/role-matrix',
        icon: KeyRound,
        label: 'Role Matrix',
        desc: 'Permission matrix overview',
      },
      {
        to: '/admin/team',
        icon: Users2,
        label: 'Team Management',
        desc: 'Manage org teams',
      },
      {
        to: '/admin/sso',
        icon: Lock,
        label: 'SSO Configuration',
        desc: 'Single sign-on settings',
      },
      {
        to: '/admin/scim',
        icon: Database,
        label: 'SCIM Provisioning',
        desc: 'Auto-sync users from IdP',
      },
      {
        to: '/admin/enrollment',
        icon: ClipboardList,
        label: 'Enrollment',
        desc: 'Manage course enrollments',
      },
    ],
  },
  {
    heading: 'Content & Learning',
    links: [
      {
        to: '/admin/jargon',
        icon: BookOpen,
        label: 'Jargon Management',
        desc: 'Org-specific terminology',
      },
      {
        to: '/admin/languages',
        icon: Globe,
        label: 'Language Settings',
        desc: 'Platform locale settings',
      },
      {
        to: '/admin/catalog',
        icon: BookMarked,
        label: 'Course Catalog',
        desc: 'Browse org content catalog',
      },
      {
        to: '/admin/org-gamification',
        icon: Trophy,
        label: 'Gamification Config',
        desc: 'Points, badges, leaderboards',
      },
      {
        to: '/admin/gamification',
        icon: Trophy,
        label: 'Gamification Settings',
        desc: 'Global gamification rules',
      },
      {
        to: '/admin/auto-grading',
        icon: ClipboardCheck,
        label: 'Auto-Grading',
        desc: 'Automated assessment grading',
      },
      {
        to: '/admin/assessments',
        icon: Layers,
        label: 'Assessment Campaigns',
        desc: '360° assessment campaigns',
      },
      {
        to: '/admin/portal',
        icon: Edit3,
        label: 'Portal Builder',
        desc: 'Customise learner portal',
      },
      {
        to: '/admin/cpd',
        icon: FileText,
        label: 'CPD Settings',
        desc: 'Continuing professional development',
      },
    ],
  },
  {
    heading: 'Analytics & Reporting',
    links: [
      {
        to: '/admin/analytics',
        icon: BarChart2,
        label: 'Analytics',
        desc: 'Org-level analytics',
      },
      {
        to: '/admin/org-analytics',
        icon: Activity,
        label: 'Org Analytics',
        desc: 'Detailed org metrics',
      },
      {
        to: '/admin/platform-usage',
        icon: Gauge,
        label: 'Platform Usage',
        desc: 'Engagement and usage stats',
      },
      {
        to: '/admin/usage',
        icon: TrendingUp,
        label: 'Usage',
        desc: 'Resource consumption overview',
      },
      {
        to: '/admin/roi-analytics',
        icon: TrendingUp,
        label: 'ROI Analytics',
        desc: 'Learning ROI dashboard',
      },
      {
        to: '/admin/bi-export',
        icon: FileDown,
        label: 'BI Export',
        desc: 'Export data to BI tools',
      },
      {
        to: '/admin/gap-analysis',
        icon: SearchX,
        label: 'Gap Analysis',
        desc: 'Skill gap reporting',
      },
      {
        to: '/admin/at-risk',
        icon: AlertTriangle,
        label: 'At-Risk Learners',
        desc: 'Identify struggling learners',
      },
    ],
  },
  {
    heading: 'Compliance & Security',
    links: [
      {
        to: '/admin/security',
        icon: Lock,
        label: 'Security Settings',
        desc: 'MFA, sessions, IP rules',
      },
      {
        to: '/admin/audit',
        icon: ScrollText,
        label: 'Audit Log',
        desc: 'Admin action history',
      },
      {
        to: '/admin/audit-log',
        icon: ScrollText,
        label: 'Audit Log (Admin)',
        desc: 'Advanced audit viewer',
      },
      {
        to: '/admin/audit-viewer',
        icon: Info,
        label: 'Audit Viewer (MVP)',
        desc: 'MVP audit log page',
      },
      {
        to: '/admin/compliance',
        icon: ClipboardCheck,
        label: 'Compliance Reports',
        desc: 'Reports and deadlines',
      },
    ],
  },
  {
    heading: 'Integrations & Configuration',
    links: [
      {
        to: '/admin/branding',
        icon: Palette,
        label: 'Branding',
        desc: 'Logos, colors, themes',
      },
      {
        to: '/admin/announcements',
        icon: Megaphone,
        label: 'Announcements',
        desc: 'Platform-wide notices',
      },
      {
        to: '/admin/announcements-editor',
        icon: Edit3,
        label: 'Announcements Editor',
        desc: 'Rich announcement editor',
      },
      {
        to: '/admin/notifications',
        icon: Bell,
        label: 'Notification Templates',
        desc: 'Email/push templates',
      },
      {
        to: '/admin/lti',
        icon: Link2,
        label: 'LTI Integration',
        desc: 'LTI 1.3 tool connections',
      },
      {
        to: '/admin/xapi',
        icon: Activity,
        label: 'xAPI / LRS',
        desc: 'Learning record store',
      },
      {
        to: '/admin/crm',
        icon: Users,
        label: 'CRM Integration',
        desc: 'Salesforce / CRM sync',
      },
      {
        to: '/admin/hris-config',
        icon: Database,
        label: 'HRIS Integration',
        desc: 'HR system configuration',
      },
      {
        to: '/admin/api-keys',
        icon: KeyRound,
        label: 'API Keys',
        desc: 'Manage API credentials',
      },
      {
        to: '/admin/webhooks',
        icon: Webhook,
        label: 'Webhooks',
        desc: 'Event-driven integrations',
      },
      {
        to: '/admin/domains',
        icon: Server,
        label: 'Domain Config',
        desc: 'Custom domain settings',
      },
      {
        to: '/admin/embeddings',
        icon: BrainCircuit,
        label: 'Embedding Dashboard',
        desc: 'AI embedding management',
      },
      {
        to: '/admin/marketplace',
        icon: BookMarked,
        label: 'Marketplace',
        desc: 'Browse content marketplace',
      },
    ],
  },
  {
    heading: 'Billing & Revenue',
    links: [
      {
        to: '/admin/billing',
        icon: CreditCard,
        label: 'Billing',
        desc: 'Subscription and payments',
      },
      {
        to: '/admin/invoices',
        icon: Receipt,
        label: 'Invoices',
        desc: 'Stripe invoice history',
      },
      {
        to: '/admin/pilot-requests',
        icon: Rocket,
        label: 'Pilot Requests',
        desc: 'Manage org pilot access',
      },
    ],
  },
];

interface Props {
  /** Optional extra class applied to the outer wrapper */
  className?: string;
}

export function AdminQuickLinksGrid({ className }: Props) {
  return (
    <div className={className}>
      {LINK_GROUPS.map((group) => (
        <section key={group.heading} className="mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {group.heading}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {group.links.map(({ to, icon: Icon, label, desc }) => (
              <Link key={to} to={to}>
                <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
                  <CardContent className="flex items-start gap-3 py-3 px-3">
                    <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-xs leading-snug">
                        {label}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">
                        {desc}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
