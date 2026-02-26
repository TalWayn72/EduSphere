/**
 * LtiController — HTTP endpoints for LTI 1.3 OIDC flow.
 *
 * POST /lti/login   — OIDC login initiation (platform → tool)
 * POST /lti/launch  — JWT launch validation (platform → tool after OIDC)
 * GET  /lti/jwks    — Tool's public JWKS (used by platforms to verify tool JWTs)
 */
import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { LtiService } from './lti.service';
import type { LtiLoginRequest, LtiLaunchRequest } from './lti.types';

@Controller('lti')
export class LtiController {
  private readonly logger = new Logger(LtiController.name);

  constructor(private readonly ltiService: LtiService) {}

  // ── POST /lti/login ─────────────────────────────────────────────────────────

  /**
   * Step 1 of the LTI 1.3 launch flow — Login Initiation.
   *
   * The platform POSTs here first.  We:
   *  1. Validate the issuer matches the registered platform.
   *  2. Generate a cryptographic state token and nonce.
   *  3. Store state → nonce mapping (5-minute TTL, one-time use).
   *  4. Redirect the browser to the platform's OIDC authentication endpoint.
   */
  @Post('login')
  @HttpCode(HttpStatus.FOUND)
  async initiateLogin(
    @Body() body: LtiLoginRequest,
    @Res() res: Response
  ): Promise<void> {
    this.logger.log({ iss: body.iss }, 'LTI login initiation received');

    const state = this.ltiService.generateState();
    const nonce = this.ltiService.generateNonce();

    await this.ltiService.storeState(state, nonce, body.login_hint);

    const authUrl = this.ltiService.buildAuthUrl(body, state, nonce);
    this.logger.debug({ authUrl }, 'Redirecting to platform auth endpoint');

    res.redirect(authUrl);
  }

  // ── POST /lti/launch ────────────────────────────────────────────────────────

  /**
   * Step 3 of the LTI 1.3 launch flow — JWT Launch.
   *
   * The platform POSTs here after the user authenticates at the OIDC endpoint.
   * We:
   *  1. Validate the id_token JWT signature against the platform's JWKS.
   *  2. Verify the nonce matches the stored state (one-time use → deleted).
   *  3. Extract LTI claims and resolve the target EduSphere URL (deep link).
   *  4. Create a short-lived session token.
   *  5. Redirect the browser to the target URL with the session token.
   */
  @Post('launch')
  @HttpCode(HttpStatus.FOUND)
  async handleLaunch(
    @Body() body: LtiLaunchRequest,
    @Res() res: Response
  ): Promise<void> {
    this.logger.log('LTI launch received');

    const claims = await this.ltiService.validateLaunch(
      body.id_token,
      body.state
    );
    const sessionToken = this.ltiService.createSession(claims);
    const targetPath = this.ltiService.resolveTargetUrl(claims);

    const frontendBase =
      process.env['TOOL_BASE_URL'] ?? 'http://localhost:5173';
    const redirectUrl = `${frontendBase}/lti/launch?lti_token=${sessionToken}&target=${encodeURIComponent(targetPath)}`;

    this.logger.log(
      { sub: claims.sub, targetPath },
      'LTI launch successful — redirecting'
    );
    res.redirect(redirectUrl);
  }

  // ── GET /lti/jwks ────────────────────────────────────────────────────────────

  /**
   * Returns the tool's public JSON Web Key Set (JWKS).
   * Platforms use this endpoint to verify messages signed by EduSphere
   * (e.g. Deep Linking responses, Assignment and Grade Services JWTs).
   */
  @Get('jwks')
  getJwks(): Record<string, unknown> {
    this.logger.debug('JWKS endpoint called');
    return this.ltiService.getToolJwks();
  }
}
