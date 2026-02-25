/**
 * admin-roles.queries.ts
 * GraphQL operations for roles & permissions management.
 * Custom roles backend is planned for Phase 2b; local state simulates mutations.
 */
import { gql } from 'urql';

// ---------------------------------------------------------------------------
// Fragments
// ---------------------------------------------------------------------------

export const ROLE_FIELDS = gql`
  fragment RoleFields on Role {
    id
    name
    description
    isSystem
    userCount
    permissions
    createdAt
  }
`;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** List all roles for the current tenant (system + custom). */
export const LIST_ROLES_QUERY = gql`
  ${ROLE_FIELDS}
  query ListRoles {
    roles {
      ...RoleFields
    }
  }
`;

/** Fetch a single role by ID. */
export const GET_ROLE_QUERY = gql`
  ${ROLE_FIELDS}
  query GetRole($id: ID!) {
    role(id: $id) {
      ...RoleFields
    }
  }
`;

// ---------------------------------------------------------------------------
// Mutations (wired for Phase 2b backend)
// ---------------------------------------------------------------------------

export const CREATE_ROLE_MUTATION = gql`
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(input: $input) {
      id
      name
      description
      isSystem
      userCount
      permissions
    }
  }
`;

export const UPDATE_ROLE_MUTATION = gql`
  mutation UpdateRole($id: ID!, $input: UpdateRoleInput!) {
    updateRole(id: $id, input: $input) {
      id
      name
      description
      permissions
    }
  }
`;

export const DELETE_ROLE_MUTATION = gql`
  mutation DeleteRole($id: ID!) {
    deleteRole(id: $id)
  }
`;
