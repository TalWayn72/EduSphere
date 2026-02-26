/**
 * PII Encryption Helpers — AES-256-GCM
 * SI-3: All PII fields must be encrypted at rest using these helpers.
 * Key derivation: HMAC-SHA256(ENCRYPTION_MASTER_KEY, tenantId) → 32-byte tenant key
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

/**
 * Derive a tenant-specific 32-byte encryption key from the master key.
 * Uses HMAC-SHA256(masterKey, tenantId) for key separation between tenants.
 */
export function deriveTenantKey(tenantId: string): Buffer {
  const masterKey = process.env['ENCRYPTION_MASTER_KEY'];
  if (!masterKey || masterKey.length < 32) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY must be set and at least 32 characters'
    );
  }
  return createHmac('sha256', Buffer.from(masterKey, 'utf8'))
    .update(tenantId)
    .digest()
    .subarray(0, KEY_LENGTH);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 * Returns null if input is null/undefined.
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
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt an AES-256-GCM encrypted field.
 * Input format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 * Returns null if input is null/undefined.
 */
export function decryptField(ciphertext: string, tenantKey: Buffer): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted field format — expected iv:authTag:ciphertext'
    );
  }

  const [ivHex, authTagHex, encryptedHex] = parts as [string, string, string];
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
