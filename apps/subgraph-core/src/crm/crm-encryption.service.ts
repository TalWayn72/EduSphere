/**
 * CrmEncryptionService — AES-256-GCM encryption for CRM OAuth tokens.
 * Implements SI-3: PII fields (access/refresh tokens) must be encrypted at rest.
 */
import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

@Injectable()
export class CrmEncryptionService {
  private readonly key: Buffer;

  constructor() {
    const rawKey = process.env['CRM_ENCRYPTION_KEY'] ?? '';
    if (!rawKey) throw new Error('CRM_ENCRYPTION_KEY env var is required');
    this.key = Buffer.from(rawKey, 'base64');
    if (this.key.length !== 32) {
      throw new Error('CRM_ENCRYPTION_KEY must be 32 bytes (base64-encoded)');
    }
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * Output format: hex(iv) + ':' + hex(authTag) + ':' + hex(ciphertext)
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypts a value produced by encrypt().
   */
  decrypt(encryptedValue: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted token format');
    const [ivHex, tagHex, dataHex] = parts as [string, string, string];
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    if (tag.length !== TAG_BYTES) throw new Error('Invalid auth tag length');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8'
    );
  }
}
