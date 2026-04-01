/**
 * SidebarNavGroups -- Navigation items and role-filtered group definitions.
 * Extracted from AppSidebar for file-size compliance.
 */
import {
  LayoutDashboard,
  BookOpen,
  Compass,
  Network,
  Bot,
  Video,
  Brain,
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

export interface NavItem {
  to: string;
  icon: React.ElementType;
  labelKey: string;
}

export interface NavGroup {
  key: string;
  headingKey: string;
  items: NavItem[];
  /** Roles that can see this group. If empty/undefined, visible to all. */
  allowedRoles?: Set<string>;
}

/** Learning group -- visible to all authenticated users */
const LEARNING_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'home' },
  { to: '/courses', icon: BookOpen, labelKey: 'myCourses' },
  { to: '/explore', icon: Compass, labelKey: 'discover' },
  { to: '/knowledge-graph', icon: Network, labelKey: 'knowledgeGraph' },
  { to: '/agents', icon: Bot, labelKey: 'aiTutor' },
  { to: '/sessions', icon: Video, labelKey: 'liveSessions' },
  { to: '/srs-review', icon: Brain, labelKey: 'srsReview' },
  { to: '/skills', icon: Target, labelKey: 'skillPaths' },
  { to: '/gamification', icon: Trophy, labelKey: 'gamification' },
  { to: '/certificates', icon: Award, labelKey: 'certificates' },
];

/** Social group -- visible to all authenticated users */
const SOCIAL_ITEMS: NavItem[] = [
  { to: '/discussions', icon: MessageSquare, labelKey: 'discussions' },
  { to: '/social', icon: Users, labelKey: 'socialFeed' },
  { to: '/people', icon: Search, labelKey: 'findPeople' },
  { to: '/challenges', icon: Swords, labelKey: 'groupChallenges' },
];

/** Teaching group -- INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN */
const TEACHING_ITEMS: NavItem[] = [
  { to: '/quiz-builder', icon: FileQuestion, labelKey: 'quizBuilder' },
  { to: '/assessments', icon: ClipboardList, labelKey: 'assessments' },
  { to: '/peer-review', icon: Star, labelKey: 'peerReview' },
  { to: '/peer-matching', icon: UserCheck, labelKey: 'peerMatching' },
];

/** Analytics group -- INSTRUCTOR, RESEARCHER, ORG_ADMIN, SUPER_ADMIN */
const ANALYTICS_ITEMS: NavItem[] = [
  { to: '/manager', icon: BarChart2, labelKey: 'managerDashboard' },
  { to: '/cohort-insights', icon: Lightbulb, labelKey: 'cohortInsights' },
];

const TEACHING_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);
const ANALYTICS_ROLES = new Set([
  'INSTRUCTOR',
  'RESEARCHER',
  'MANAGER',
  'ORG_ADMIN',
  'SUPER_ADMIN',
]);

export const NAV_GROUPS: NavGroup[] = [
  { key: 'learning', headingKey: 'groupLearning', items: LEARNING_ITEMS },
  { key: 'social', headingKey: 'groupSocial', items: SOCIAL_ITEMS },
  {
    key: 'teaching',
    headingKey: 'groupTeaching',
    items: TEACHING_ITEMS,
    allowedRoles: TEACHING_ROLES,
  },
  {
    key: 'analytics',
    headingKey: 'groupAnalytics',
    items: ANALYTICS_ITEMS,
    allowedRoles: ANALYTICS_ROLES,
  },
];

export const SIDEBAR_KEY = 'edusphere-sidebar-collapsed';

export function getInitials(
  firstName?: string,
  lastName?: string,
  username?: string
): string {
  const f = firstName?.[0] ?? '';
  const l = lastName?.[0] ?? '';
  return (f + l).toUpperCase() || (username?.[0] ?? 'U').toUpperCase();
}
