/**
 * OpenBadge public HTTP controller — serves JSON-LD assertion and badge documents (F-025)
 * Endpoints are PUBLIC (no Bearer auth required) per OB3 spec verifiability requirement.
 */
import { Controller, Get, Param, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { OpenBadgeService } from './open-badge.service.js';
import type { OpenBadgeProof, Ob3Credential } from './open-badge.types.js';

const BASE_URL = process.env.OPENBADGE_BASE_URL ?? 'https://edusphere.io';
const LD_JSON = 'application/ld+json';

@Controller('ob3')
export class OpenBadgeController {
  constructor(private readonly badgeService: OpenBadgeService) {}

  /**
   * GET /ob3/assertion/:id
   * Returns the full signed JSON-LD OpenBadge 3.0 credential.
   * If revoked, includes credentialStatus field indicating revocation.
   * Content-Type: application/ld+json
   */
  @Get('assertion/:id')
  async getAssertion(
    @Param('id') assertionId: string,
    @Res() res: Response,
  ): Promise<void> {
    const assertion = await this.badgeService.getAssertionById(assertionId);
    if (!assertion) {
      res.status(HttpStatus.NOT_FOUND).json({ error: 'Assertion not found' });
      return;
    }

    const def = await this.badgeService.getDefinitionById(assertion.badgeDefinitionId);
    if (!def) {
      res.status(HttpStatus.NOT_FOUND).json({ error: 'Badge definition not found' });
      return;
    }

    const body = this.badgeService.buildCredentialBody(
      def,
      {
        userId: assertion.recipientId,
        badgeDefinitionId: def.id,
        tenantId: assertion.tenantId,
        expiresAt: assertion.expiresAt ?? undefined,
      },
    );

    // Replace pending placeholder with real assertion ID
    const credentialWithId = {
      ...body,
      id: `${BASE_URL}/ob3/assertion/${assertion.id}`,
      issuanceDate: assertion.issuedAt.toISOString(),
      ...(assertion.expiresAt ? { expirationDate: assertion.expiresAt.toISOString() } : {}),
    };

    const credential: Ob3Credential & { credentialStatus?: unknown } = {
      ...credentialWithId,
      proof: assertion.proof as unknown as OpenBadgeProof,
      ...(assertion.revoked
        ? {
            credentialStatus: {
              type: 'RevocationList2020Status',
              revokedAt: assertion.revokedAt?.toISOString(),
              revokedReason: assertion.revokedReason,
            },
          }
        : {}),
    };

    res
      .status(HttpStatus.OK)
      .setHeader('Content-Type', LD_JSON)
      .setHeader('Cache-Control', 'no-cache, no-store')
      .json(credential);
  }

  /**
   * GET /ob3/badge/:id
   * Returns the badge definition as a JSON-LD Achievement object.
   * Content-Type: application/ld+json
   */
  @Get('badge/:id')
  async getBadgeDefinition(
    @Param('id') definitionId: string,
    @Res() res: Response,
  ): Promise<void> {
    const def = await this.badgeService.getDefinitionById(definitionId);
    if (!def) {
      res.status(HttpStatus.NOT_FOUND).json({ error: 'Badge definition not found' });
      return;
    }

    const achievement = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
      ],
      id: `${BASE_URL}/ob3/badge/${def.id}`,
      type: ['Achievement'],
      name: def.name,
      description: def.description,
      criteria: { narrative: def.criteriaUrl ?? `${BASE_URL}/ob3/badge/${def.id}` },
      tags: def.tags,
      version: def.version,
      ...(def.imageUrl ? { image: { id: def.imageUrl, type: 'Image' } } : {}),
      issuer: {
        id: def.issuerId,
        type: 'Profile',
        name: 'EduSphere',
      },
    };

    res
      .status(HttpStatus.OK)
      .setHeader('Content-Type', LD_JSON)
      .setHeader('Cache-Control', 'public, max-age=3600')
      .json(achievement);
  }
}
