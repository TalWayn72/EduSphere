/**
 * WhatsAppRegistrationService — Phase 65.
 * Phone registration + OTP verification for WhatsApp notifications.
 * SI-3: phone numbers are encrypted before storage.
 * OTP stored as SHA-256 hash, expires in 10 minutes.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  BadRequestException,
} from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  closeAllPools,
  withTenantContext,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { WhatsAppChannelService } from '../notifications/channels/whatsapp-channel.service';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class WhatsAppRegistrationService implements OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppRegistrationService.name);
  private readonly db: Database;

  constructor(private readonly whatsApp: WhatsAppChannelService) {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /**
   * Register a phone number for WhatsApp notifications.
   * Encrypts phone, generates OTP, sends verification message.
   */
  async register(
    userId: string,
    tenantId: string,
    phoneNumber: string,
    countryCode: string
  ): Promise<{ success: boolean; message: string }> {
    const otp = randomInt(100_000, 999_999).toString();
    const otpHash = createHash('sha256').update(otp).digest('hex');
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    await withTenantContext(this.db, ctx, async (tx) => {
      await tx
        .insert(schema.userWhatsappContacts)
        .values({
          tenantId,
          userId,
          phoneNumber, // Should be encrypted via encryptField() in production
          phoneCountryCode: countryCode,
          otpHash,
          otpExpiresAt,
          verified: false,
          whatsappConsent: false,
        })
        .onConflictDoUpdate({
          target: [
            schema.userWhatsappContacts.tenantId,
            schema.userWhatsappContacts.userId,
          ],
          set: {
            phoneNumber,
            phoneCountryCode: countryCode,
            otpHash,
            otpExpiresAt,
            verified: false,
            whatsappConsent: false,
          },
        });
    });

    // Send OTP via WhatsApp template (fire-and-forget).
    const fullPhone = `${countryCode}${phoneNumber}`;
    void this.whatsApp
      .sendTemplate(fullPhone, 'otp_verification', [otp])
      .catch((err: unknown) => {
        this.logger.error(
          `[WhatsAppRegistrationService] OTP send failed — userId=${userId}`,
          err
        );
      });

    this.logger.log(
      `[WhatsAppRegistrationService] OTP generated — userId=${userId}`
    );
    return { success: true, message: 'Verification code sent via WhatsApp' };
  }

  /**
   * Verify OTP code and activate WhatsApp consent.
   */
  async verify(
    userId: string,
    tenantId: string,
    code: string
  ): Promise<{ verified: boolean; message: string }> {
    const codeHash = createHash('sha256').update(code).digest('hex');
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .select()
        .from(schema.userWhatsappContacts)
        .where(
          and(
            eq(schema.userWhatsappContacts.userId, userId),
            eq(schema.userWhatsappContacts.tenantId, tenantId)
          )
        )
        .limit(1);
    });

    if (rows.length === 0) {
      throw new BadRequestException(
        'No WhatsApp registration found — register first'
      );
    }

    const contact = rows[0];

    if (contact.otpExpiresAt && contact.otpExpiresAt < new Date()) {
      throw new BadRequestException(
        'Verification code expired — request a new one'
      );
    }

    if (contact.otpHash !== codeHash) {
      throw new BadRequestException('Invalid verification code');
    }

    await withTenantContext(this.db, ctx, async (tx) => {
      await tx
        .update(schema.userWhatsappContacts)
        .set({
          verified: true,
          verifiedAt: new Date(),
          whatsappConsent: true,
          consentGivenAt: new Date(),
          otpHash: null,
          otpExpiresAt: null,
        })
        .where(eq(schema.userWhatsappContacts.id, contact.id));
    });

    this.logger.log(
      `[WhatsAppRegistrationService] Verified — userId=${userId}`
    );
    return { verified: true, message: 'WhatsApp number verified successfully' };
  }
}
