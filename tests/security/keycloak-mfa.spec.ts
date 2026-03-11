/**
 * Security Test: Keycloak MFA Enforcement (ISO 27001 A.9.4.2, SOC 2 CC6.1)
 *
 * Static configuration test — validates the Keycloak realm JSON enforces
 * TOTP/MFA for privileged roles (ORG_ADMIN, SUPER_ADMIN), password policy
 * complexity, and session lifetime limits.
 *
 * No running Keycloak instance required; this reads the committed JSON.
 */

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const REALM_PATH = resolve(
  join(import.meta.dirname, '../../infrastructure/docker/keycloak-realm.json'),
);

interface AuthExecution {
  authenticator?: string;
  authenticatorFlow?: boolean;
  requirement: string;
  priority: number;
  flowAlias?: string;
  authenticatorConfig?: string;
  userSetupAllowed?: boolean;
}

interface AuthFlow {
  id: string;
  alias: string;
  description?: string;
  providerId: string;
  topLevel: boolean;
  builtIn: boolean;
  authenticationExecutions: AuthExecution[];
}

interface RequiredAction {
  alias: string;
  name: string;
  providerId: string;
  enabled: boolean;
  defaultAction: boolean;
  priority: number;
}

interface AuthenticatorConfig {
  id: string;
  alias: string;
  config: Record<string, string>;
}

interface KeycloakRealm {
  realm: string;
  passwordPolicy?: string;
  ssoSessionMaxLifespan: number;
  ssoSessionIdleTimeout: number;
  authenticationFlows: AuthFlow[];
  requiredActions: RequiredAction[];
  authenticatorConfig?: AuthenticatorConfig[];
  browserFlow: string;
  [key: string]: unknown;
}

function loadRealm(): KeycloakRealm {
  const raw = readFileSync(REALM_PATH, 'utf-8');
  return JSON.parse(raw) as KeycloakRealm;
}

describe('Keycloak MFA enforcement (ISO 27001 A.9.4.2, SOC 2 CC6.1)', () => {
  let realm: KeycloakRealm;

  beforeAll(() => {
    realm = loadRealm();
  });

  // ─── Password Policy ───────────────────────────────────────────────────────

  describe('Password policy', () => {
    it('has a passwordPolicy defined', () => {
      expect(realm.passwordPolicy).toBeTruthy();
    });

    it('requires minimum length of 12 characters', () => {
      expect(realm.passwordPolicy).toContain('length(12)');
    });

    it('requires at least 1 uppercase letter', () => {
      expect(realm.passwordPolicy).toContain('upperCase(1)');
    });

    it('requires at least 1 lowercase letter', () => {
      expect(realm.passwordPolicy).toContain('lowerCase(1)');
    });

    it('requires at least 1 digit', () => {
      expect(realm.passwordPolicy).toContain('digits(1)');
    });

    it('requires at least 1 special character', () => {
      expect(realm.passwordPolicy).toContain('specialChars(1)');
    });

    it('forbids username as password', () => {
      expect(realm.passwordPolicy).toContain('notUsername');
    });

    it('forbids email as password', () => {
      expect(realm.passwordPolicy).toContain('notEmail');
    });

    it('enforces password history of 5', () => {
      expect(realm.passwordPolicy).toContain('passwordHistory(5)');
    });
  });

  // ─── Session Limits ────────────────────────────────────────────────────────

  describe('Session lifetime limits', () => {
    it('ssoSessionMaxLifespan is at most 28800 seconds (8 hours)', () => {
      expect(realm.ssoSessionMaxLifespan).toBeGreaterThan(0);
      expect(realm.ssoSessionMaxLifespan).toBeLessThanOrEqual(28800);
    });

    it('ssoSessionIdleTimeout is at most 1800 seconds (30 minutes)', () => {
      expect(realm.ssoSessionIdleTimeout).toBeGreaterThan(0);
      expect(realm.ssoSessionIdleTimeout).toBeLessThanOrEqual(1800);
    });
  });

  // ─── CONFIGURE_TOTP Required Action ───────────────────────────────────────

  describe('CONFIGURE_TOTP required action', () => {
    it('CONFIGURE_TOTP required action is present', () => {
      const action = realm.requiredActions.find((a) => a.alias === 'CONFIGURE_TOTP');
      expect(action).toBeDefined();
    });

    it('CONFIGURE_TOTP required action is enabled', () => {
      const action = realm.requiredActions.find((a) => a.alias === 'CONFIGURE_TOTP');
      expect(action?.enabled).toBe(true);
    });
  });

  // ─── Authentication Flows ──────────────────────────────────────────────────

  describe('Authentication flows — MFA for privileged roles', () => {
    it('has a "MFA - Privileged Role OTP" flow defined', () => {
      const flow = realm.authenticationFlows.find(
        (f) => f.alias === 'MFA - Privileged Role OTP',
      );
      expect(flow).toBeDefined();
    });

    it('"MFA - Privileged Role OTP" flow contains a REQUIRED auth-otp-form execution', () => {
      const flow = realm.authenticationFlows.find(
        (f) => f.alias === 'MFA - Privileged Role OTP',
      );
      const otpExecution = flow?.authenticationExecutions.find(
        (e) => e.authenticator === 'auth-otp-form',
      );
      expect(otpExecution).toBeDefined();
      expect(otpExecution?.requirement).toBe('REQUIRED');
    });

    it('"MFA - Privileged Role OTP" flow has a conditional-user-role step', () => {
      const flow = realm.authenticationFlows.find(
        (f) => f.alias === 'MFA - Privileged Role OTP',
      );
      const roleCondition = flow?.authenticationExecutions.find(
        (e) => e.authenticator === 'conditional-user-role',
      );
      expect(roleCondition).toBeDefined();
      expect(roleCondition?.requirement).toBe('REQUIRED');
    });

    it('"forms" flow includes the "MFA - Privileged Role OTP" sub-flow', () => {
      const formsFlow = realm.authenticationFlows.find((f) => f.alias === 'forms');
      expect(formsFlow).toBeDefined();
      const privilegedStep = formsFlow?.authenticationExecutions.find(
        (e) => e.flowAlias === 'MFA - Privileged Role OTP',
      );
      expect(privilegedStep).toBeDefined();
      expect(privilegedStep?.requirement).toBe('CONDITIONAL');
    });

    it('"forms" flow delegates to "Browser - Conditional 2FA" for standard 2FA', () => {
      const formsFlow = realm.authenticationFlows.find((f) => f.alias === 'forms');
      const conditionalStep = formsFlow?.authenticationExecutions.find(
        (e) => e.flowAlias === 'Browser - Conditional 2FA',
      );
      expect(conditionalStep).toBeDefined();
      expect(conditionalStep?.requirement).toBe('CONDITIONAL');
    });

    it('"Browser - Conditional 2FA" flow has OTP as REQUIRED (not OPTIONAL)', () => {
      const flow = realm.authenticationFlows.find(
        (f) => f.alias === 'Browser - Conditional 2FA',
      );
      const otpExecution = flow?.authenticationExecutions.find(
        (e) => e.authenticator === 'auth-otp-form',
      );
      expect(otpExecution).toBeDefined();
      expect(otpExecution?.requirement).toBe('REQUIRED');
    });
  });

  // ─── Authenticator Config ─────────────────────────────────────────────────

  describe('Authenticator configuration — privileged roles', () => {
    it('has a "privileged-role-condition" authenticator config', () => {
      const config = realm.authenticatorConfig?.find(
        (c) => c.alias === 'privileged-role-condition',
      );
      expect(config).toBeDefined();
    });

    it('"privileged-role-condition" config targets ORG_ADMIN role', () => {
      const config = realm.authenticatorConfig?.find(
        (c) => c.alias === 'privileged-role-condition',
      );
      expect(config?.config.roles).toContain('ORG_ADMIN');
    });

    it('"privileged-role-condition" config targets SUPER_ADMIN role', () => {
      const config = realm.authenticatorConfig?.find(
        (c) => c.alias === 'privileged-role-condition',
      );
      expect(config?.config.roles).toContain('SUPER_ADMIN');
    });
  });

  // ─── Browser Flow Binding ─────────────────────────────────────────────────

  describe('Browser flow binding', () => {
    it('browserFlow is set to "browser"', () => {
      expect(realm.browserFlow).toBe('browser');
    });

    it('"browser" top-level flow delegates to "forms" sub-flow', () => {
      const browserFlow = realm.authenticationFlows.find(
        (f) => f.alias === 'browser' && f.topLevel,
      );
      expect(browserFlow).toBeDefined();
      const formsStep = browserFlow?.authenticationExecutions.find(
        (e) => e.flowAlias === 'forms',
      );
      expect(formsStep).toBeDefined();
    });
  });
});
