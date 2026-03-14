/**
 * HRIS Credential Helper — SI-3 compliant encryption for HRIS secrets.
 *
 * Encrypts clientId/clientSecret before DB persistence and decrypts
 * on retrieval. Credentials are NEVER logged — only masked placeholders.
 */
import { Logger } from '@nestjs/common';
import {
  encryptField,
  decryptField,
  deriveTenantKey,
} from '@edusphere/db';
import type { HrisConfig } from './hris-adapter.interface.js';

const logger = new Logger('HrisCredentialHelper');

/** Fields on HrisConfig that contain secrets and must be encrypted. */
const SECRET_FIELDS: ReadonlyArray<keyof Pick<HrisConfig, 'clientId' | 'clientSecret'>> = [
  'clientId',
  'clientSecret',
];

/**
 * Return a copy of the config with clientId/clientSecret encrypted
 * using the tenant's derived key. Safe to persist to DB.
 */
export function encryptHrisCredentials(config: HrisConfig): HrisConfig {
  const tenantKey = deriveTenantKey(config.tenantId);
  const encrypted = { ...config };

  for (const field of SECRET_FIELDS) {
    const value = encrypted[field];
    if (value) {
      encrypted[field] = encryptField(value, tenantKey);
    }
  }

  logger.log(
    { tenantId: config.tenantId, type: config.type },
    'HRIS credentials encrypted for storage',
  );
  return encrypted;
}

/**
 * Return a copy of the config with clientId/clientSecret decrypted.
 * Use this before passing config to an adapter for API calls.
 */
export function decryptHrisCredentials(config: HrisConfig): HrisConfig {
  const tenantKey = deriveTenantKey(config.tenantId);
  const decrypted = { ...config };

  for (const field of SECRET_FIELDS) {
    const value = decrypted[field];
    if (value && value.includes(':')) {
      try {
        decrypted[field] = decryptField(value, tenantKey);
      } catch {
        logger.error(
          { tenantId: config.tenantId, field },
          'Failed to decrypt HRIS credential — field may be plaintext or corrupt',
        );
      }
    }
  }

  return decrypted;
}

/**
 * Redact secrets from a config object for safe logging.
 * Returns a shallow copy with secret fields replaced by '***'.
 */
export function redactHrisConfig(config: HrisConfig): Record<string, unknown> {
  return {
    type: config.type,
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
    clientId: config.clientId ? '***' : undefined,
    clientSecret: config.clientSecret ? '***' : undefined,
    fieldMapping: config.fieldMapping,
  };
}
