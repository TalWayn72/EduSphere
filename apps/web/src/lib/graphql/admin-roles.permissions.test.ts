import { describe, it, expect } from 'vitest';
import {
  PERMISSION_GROUPS,
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  SYSTEM_ROLES,
} from './admin-roles.permissions';

describe('admin-roles.permissions', () => {
  describe('PERMISSION_GROUPS', () => {
    it('is a non-empty array of PermissionGroup objects', () => {
      expect(PERMISSION_GROUPS).toBeDefined();
      expect(Array.isArray(PERMISSION_GROUPS)).toBe(true);
      expect(PERMISSION_GROUPS.length).toBeGreaterThan(0);
    });

    it('each group has a label and non-empty permissions array', () => {
      for (const group of PERMISSION_GROUPS) {
        expect(typeof group.label).toBe('string');
        expect(group.label.length).toBeGreaterThan(0);
        expect(Array.isArray(group.permissions)).toBe(true);
        expect(group.permissions.length).toBeGreaterThan(0);
        for (const perm of group.permissions) {
          expect(typeof perm.key).toBe('string');
          expect(typeof perm.label).toBe('string');
        }
      }
    });
  });

  describe('ALL_PERMISSIONS', () => {
    it('is computed from PERMISSION_GROUPS and contains all permission keys', () => {
      const expectedCount = PERMISSION_GROUPS.reduce(
        (sum, g) => sum + g.permissions.length,
        0,
      );
      expect(ALL_PERMISSIONS).toHaveLength(expectedCount);
    });

    it('contains only string values', () => {
      for (const perm of ALL_PERMISSIONS) {
        expect(typeof perm).toBe('string');
      }
    });
  });

  describe('DEFAULT_ROLE_PERMISSIONS', () => {
    it('has SUPER_ADMIN with ALL permissions', () => {
      expect(DEFAULT_ROLE_PERMISSIONS['SUPER_ADMIN']).toEqual(ALL_PERMISSIONS);
    });

    it('has ORG_ADMIN with all except security:configure', () => {
      const orgAdmin = DEFAULT_ROLE_PERMISSIONS['ORG_ADMIN'];
      expect(orgAdmin).not.toContain('security:configure');
      expect(orgAdmin.length).toBe(ALL_PERMISSIONS.length - 1);
    });

    it('has INSTRUCTOR with limited permissions', () => {
      const instructor = DEFAULT_ROLE_PERMISSIONS['INSTRUCTOR'];
      expect(instructor.length).toBeGreaterThan(0);
      expect(instructor.length).toBeLessThan(ALL_PERMISSIONS.length);
    });

    it('has STUDENT with minimal permissions', () => {
      const student = DEFAULT_ROLE_PERMISSIONS['STUDENT'];
      expect(student.length).toBeGreaterThan(0);
      expect(student.length).toBeLessThan(
        DEFAULT_ROLE_PERMISSIONS['INSTRUCTOR'].length,
      );
    });
  });

  describe('SYSTEM_ROLES', () => {
    it('is a non-empty array of RoleRecord objects', () => {
      expect(SYSTEM_ROLES).toBeDefined();
      expect(Array.isArray(SYSTEM_ROLES)).toBe(true);
      expect(SYSTEM_ROLES.length).toBeGreaterThan(0);
    });

    it('each role has required fields and isSystem is true', () => {
      for (const role of SYSTEM_ROLES) {
        expect(typeof role.id).toBe('string');
        expect(typeof role.name).toBe('string');
        expect(typeof role.description).toBe('string');
        expect(role.isSystem).toBe(true);
        expect(typeof role.userCount).toBe('number');
        expect(Array.isArray(role.permissions)).toBe(true);
      }
    });

    it('role permissions match DEFAULT_ROLE_PERMISSIONS', () => {
      for (const role of SYSTEM_ROLES) {
        const expected = DEFAULT_ROLE_PERMISSIONS[role.name];
        if (expected) {
          expect(role.permissions).toEqual(expected);
        }
      }
    });
  });
});
