/**
 * PartnerController — REST stub for B2B2C Partner Portal API.
 *
 * Used by external partners via API key auth.
 * Full implementation in Phase 53 (OpenAPI spec + API key middleware).
 *
 * Endpoints:
 *   POST /api/v1/partner/apply — public; request a partnership (no auth required)
 */
import { Controller, Post, Body } from '@nestjs/common';
import { PartnerService } from './partner.service.js';
import type { PartnerType } from '@edusphere/db';

interface ApplyBody {
  name: string;
  type: string;
  contactEmail: string;
}

@Controller('api/v1/partner')
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  /**
   * Public: submit a partnership application.
   * Returns a one-time raw API key — must be securely delivered to the partner.
   */
  @Post('apply')
  async applyForPartnership(@Body() body: ApplyBody) {
    return this.partnerService.requestPartnership({
      name: body.name,
      type: body.type,
      contactEmail: body.contactEmail,
      partnerType: body.type as PartnerType,
    });
  }
}
