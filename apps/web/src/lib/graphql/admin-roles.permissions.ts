/**
 * admin-roles.permissions.ts
 * Permission group definitions and default role permission sets.
 */

export type PermissionGroup = {
  label: string;
  permissions: { key: string; label: string }[];
};

export type RoleRecord = {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Content',
    permissions: [
      { key: 'courses:view', label: 'View courses' },
      { key: 'courses:create', label: 'Create courses' },
      { key: 'courses:edit', label: 'Edit courses' },
      { key: 'courses:delete', label: 'Delete courses' },
      { key: 'courses:publish', label: 'Publish courses' },
    ],
  },
  {
    label: 'Users',
    permissions: [
      { key: 'users:view', label: 'View users' },
      { key: 'users:create', label: 'Create users' },
      { key: 'users:edit', label: 'Edit users' },
      { key: 'users:deactivate', label: 'Deactivate users' },
    ],
  },
  {
    label: 'Enrollments',
    permissions: [
      { key: 'enrollments:view', label: 'View enrollments' },
      { key: 'enrollments:create', label: 'Create enrollments' },
      { key: 'enrollments:bulk', label: 'Bulk enrollments' },
    ],
  },
  {
    label: 'Analytics',
    permissions: [
      { key: 'analytics:view', label: 'View analytics' },
      { key: 'analytics:export', label: 'Export analytics' },
    ],
  },
  {
    label: 'Compliance',
    permissions: [
      { key: 'compliance:view', label: 'View compliance' },
      { key: 'compliance:export', label: 'Export compliance' },
    ],
  },
  {
    label: 'Admin',
    permissions: [
      { key: 'gamification:configure', label: 'Configure gamification' },
      { key: 'branding:edit', label: 'Edit branding' },
      { key: 'notifications:manage', label: 'Manage notifications' },
      { key: 'security:configure', label: 'Configure security' },
      { key: 'audit:view', label: 'View audit log' },
    ],
  },
  {
    label: 'Programs',
    permissions: [
      { key: 'programs:view', label: 'View programs' },
      { key: 'programs:create', label: 'Create programs' },
      { key: 'programs:edit', label: 'Edit programs' },
    ],
  },
  {
    label: 'Knowledge',
    permissions: [
      { key: 'knowledge:view', label: 'View knowledge graph' },
      { key: 'knowledge:edit', label: 'Edit knowledge graph' },
      { key: 'knowledge:publish', label: 'Publish knowledge' },
    ],
  },
  {
    label: 'Social',
    permissions: [
      { key: 'social:view', label: 'View social feed' },
      { key: 'social:moderate', label: 'Moderate social' },
    ],
  },
  {
    label: 'Assessments',
    permissions: [
      { key: 'assessments:view', label: 'View assessments' },
      { key: 'assessments:create', label: 'Create assessments' },
      { key: 'assessments:grade', label: 'Grade assessments' },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g =>
  g.permissions.map(p => p.key),
);

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ORG_ADMIN: ALL_PERMISSIONS.filter(p => p !== 'security:configure'),
  INSTRUCTOR: [
    'courses:view', 'courses:create', 'courses:edit', 'courses:publish',
    'enrollments:view', 'analytics:view',
    'assessments:view', 'assessments:create', 'assessments:grade',
  ],
  STUDENT: ['courses:view', 'enrollments:view', 'knowledge:view', 'social:view'],
};

export const SYSTEM_ROLES: RoleRecord[] = [
  {
    id: 'system-super-admin', name: 'SUPER_ADMIN',
    description: 'Full platform access — all permissions, all tenants.',
    isSystem: true, userCount: 2,
    permissions: DEFAULT_ROLE_PERMISSIONS['SUPER_ADMIN'] ?? [],
  },
  {
    id: 'system-org-admin', name: 'ORG_ADMIN',
    description: 'Organisation administrator with full tenant management access.',
    isSystem: true, userCount: 14,
    permissions: DEFAULT_ROLE_PERMISSIONS['ORG_ADMIN'] ?? [],
  },
  {
    id: 'system-instructor', name: 'INSTRUCTOR',
    description: 'Content creator and course facilitator.',
    isSystem: true, userCount: 87,
    permissions: DEFAULT_ROLE_PERMISSIONS['INSTRUCTOR'] ?? [],
  },
  {
    id: 'system-student', name: 'STUDENT',
    description: 'Learner with access to enrolled content.',
    isSystem: true, userCount: 4312,
    permissions: DEFAULT_ROLE_PERMISSIONS['STUDENT'] ?? [],
  },
];
