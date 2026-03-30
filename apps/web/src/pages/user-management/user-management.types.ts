/**
 * UserManagement — shared types, queries, and constants.
 */

export const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);
export const PAGE_SIZE = 20;

export const ADMIN_USERS = `query AdminUsers($limit: Int, $offset: Int, $search: String, $role: UserRole) { adminUsers(limit: $limit, offset: $offset, search: $search, role: $role) { users { id email firstName lastName role tenantId createdAt } total } }`;
export const DEACTIVATE_USER = `mutation DeactivateUser($id: ID!) { deactivateUser(id: $id) }`;
export const RESET_PASSWORD = `mutation ResetUserPassword($userId: ID!) { resetUserPassword(userId: $userId) }`;
export const UPDATE_USER = `mutation UpdateUser($id: ID!, $input: UpdateUserInput!) { updateUser(id: $id, input: $input) { id email firstName lastName role } }`;

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'INSTRUCTOR'
  | 'STUDENT'
  | 'RESEARCHER';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
  createdAt: string;
}

export const ROLE_BADGE: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 border-red-200',
  ORG_ADMIN: 'bg-orange-100 text-orange-700 border-orange-200',
  INSTRUCTOR: 'bg-blue-100 text-blue-700 border-blue-200',
  STUDENT: 'bg-green-100 text-green-700 border-green-200',
  RESEARCHER: 'bg-purple-100 text-purple-700 border-purple-200',
};
