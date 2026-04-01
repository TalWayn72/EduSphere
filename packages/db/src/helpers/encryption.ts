/**
 * PII Encryption Helpers — AES-256-GCM
 * SI-3: All PII fields must be encrypted at rest using these helpers.
 * Key derivation: HMAC-SHA256(ENCRYPTION_MASTER_KEY, tenantId) → 32-byte tenant key
 * SEC-4: Version prefix enables key rotation — format: `v<N>:<iv>:<tag>:<ciphertext>`
 */
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// SEC-4: Key version prefix. When ENCRYPTION_MASTER_KEY is rotated, bump this
// to 'v2' and keep the old key available via ENCRYPTION_MASTER_KEY_V1 env var.
const CURRENT_KEY_VERSION = 'v1';

/**
 * Derive a tenant-specific 32-byte encryption key from the master key.
 * Uses HMAC-SHA256(masterKey, tenantId) for key separation between tenants.
 */
export function deriveTenantKey(tenantId: string, keyVersion?: string): Buffer {
  const version = keyVersion ?? CURRENT_KEY_VERSION;
  // Support key rotation: v1 uses ENCRYPTION_MASTER_KEY, v2 uses ENCRYPTION_MASTER_KEY_V2, etc.
  const envVar =
    version === CURRENT_KEY_VERSION
      ? 'ENCRYPTION_MASTER_KEY'
      : `ENCRYPTION_MASTER_KEY_${version.toUpperCase()}`;
  const masterKey = process.env[envVar] ?? process.env['ENCRYPTION_MASTER_KEY'];
  if (!masterKey || masterKey.length < 32) {
    throw new Error(`${envVar} must be set and at least 32 characters`);
  }
  return createHmac('sha256', Buffer.from(masterKey, 'utf8'))
    .update(tenantId)
    .digest()
    .subarray(0, KEY_LENGTH);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encryptField(value: string, tenantKey: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, tenantKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();
  return `${CURRENT_KEY_VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt an AES-256-GCM encrypted field.
 * Supports both versioned (v1:iv:tag:data) and legacy (iv:tag:data) formats.
 */
export function decryptField(ciphertext: string, tenantKey: Buffer): string {
  const parts = ciphertext.split(':');

  let ivHex: string;
  let authTagHex: string;
  let encryptedHex: string;

  if (parts.length === 4 && parts[0]!.startsWith('v')) {
    // Versioned format: v1:<iv>:<tag>:<data>
    // If key version differs from current, caller should provide the correct tenantKey
    [, ivHex, authTagHex, encryptedHex] = parts as [
      string,
      string,
      string,
      string,
    ];
  } else if (parts.length === 3) {
    // Legacy format (pre-SEC-4): <iv>:<tag>:<data>
    [ivHex, authTagHex, encryptedHex] = parts as [string, string, string];
  } else {
    throw new Error(
      'Invalid encrypted field format — expected [v<N>:]iv:authTag:ciphertext'
    );
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedData = Buffer.from(encryptedHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, tenantKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Extract key version from a ciphertext string.
 * Returns 'v1' for versioned format, 'legacy' for unversioned.
 */
export function getKeyVersion(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length === 4 && parts[0]!.startsWith('v')) {
    return parts[0]!;
  }
  return 'legacy';
}

/**
 * Re-encrypt a ciphertext from one key version to the current version.
 * Used during key rotation migrations.
 */
export function migrateEncryptedField(
  ciphertext: string,
  tenantId: string
): string {
  const version = getKeyVersion(ciphertext);
  const oldKey = deriveTenantKey(
    tenantId,
    version === 'legacy' ? CURRENT_KEY_VERSION : version
  );
  const plaintext = decryptField(ciphertext, oldKey);
  const newKey = deriveTenantKey(tenantId);
  return encryptField(plaintext, newKey);
}

/**
 * Encrypt if value is non-null, else return null.
 */
export function encryptFieldNullable(
  value: string | null | undefined,
  tenantKey: Buffer
): string | null {
  if (value == null) return null;
  return encryptField(value, tenantKey);
}

/**
 * Decrypt if value is non-null, else return null.
 */
export function decryptFieldNullable(
  ciphertext: string | null | undefined,
  tenantKey: Buffer
): string | null {
  if (ciphertext == null) return null;
  return decryptField(ciphertext, tenantKey);
}
