/**
 * Regression test — BUG-007
 * Verifies that all admin types, queries and mutations are present in supergraph.graphql.
 * Without these entries the gateway returns "Cannot query field X on type Query".
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

let supergraph: string;

beforeAll(() => {
  supergraph = readFileSync(
    join(__dirname, '../../../supergraph.graphql'),
    'utf8'
  );
});

describe('supergraph — admin types present (BUG-007 regression)', () => {
  it.each([
    'AdminOverview',
    'Announcement',
    'AnnouncementResult',
    'AuditLogEntry',
    'AuditLogResult',
    'Role',
    'RoleDelegation',
    'SecuritySettings',
  ])('object type %s is defined with @join__type(graph: CORE)', (typeName) => {
    expect(supergraph).toContain(`type ${typeName} @join__type(graph: CORE)`);
  });

  it.each([
    'adminOverview',
    'adminAnnouncements',
    'activeAnnouncements',
    'adminAuditLog',
    'roles',
    'role',
    'userDelegations',
    'mySecuritySettings',
  ])('Query.%s is routed to CORE subgraph', (field) => {
    expect(supergraph).toMatch(
      new RegExp(`${field}[^}]*@join__field\\(graph: CORE\\)`)
    );
  });

  it.each([
    'createAnnouncement',
    'updateAnnouncement',
    'deleteAnnouncement',
    'publishAnnouncement',
    'createRole',
    'updateRole',
    'deleteRole',
    'delegateRole',
    'revokeDelegation',
    'updateSecuritySettings',
  ])('Mutation.%s is routed to CORE subgraph', (field) => {
    expect(supergraph).toMatch(
      new RegExp(`${field}[^}]*@join__field\\(graph: CORE\\)`)
    );
  });

  it.each([
    'CreateAnnouncementInput',
    'UpdateAnnouncementInput',
    'CreateRoleInput',
    'UpdateRoleInput',
    'UpdateSecuritySettingsInput',
  ])('input type %s is defined', (inputName) => {
    expect(supergraph).toContain(`input ${inputName} @join__type(graph: CORE)`);
  });
});
