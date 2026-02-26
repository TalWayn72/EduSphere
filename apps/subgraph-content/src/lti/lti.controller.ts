<<<<<<< HEAD
/**
 * LtiController — HTTP endpoints for LTI 1.3 OIDC flow.
 * POST /lti/login     — OIDC login initiation (called by LMS, PUBLIC)
 * POST /lti/callback  — JWT id_token callback (PUBLIC)
 * GET  /lti/jwks      — Platform's public JWKS (PUBLIC)
 */
=======
>>>>>>> ed645f7 (feat(lti): implement LTI 1.3 login initiation + launch validation + deep linking)
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
<<<<<<< HEAD
import type { LtiLaunchParams } from './lti.types';

interface LtiLoginBody {
  iss?: string;
  login_hint?: string;
  target_link_uri?: string;
  lti_message_hint?: string;
  client_id?: string;
  deployment_id?: string;
}

interface LtiCallbackBody {
  id_token?: string;
  state?: string;
}

=======
import type { LtiLoginRequest, LtiLaunchRequest } from './lti.types';

/**
 * LtiController — exposes the three endpoints required by IMS LTI 1.3:
 *
 *  POST /lti/login   — OIDC login initiation (platform → tool)
 *  POST /lti/launch  — JWT launch validation (platform → tool after OIDC)
 *  GET  /lti/jwks    — Tool's public JWKS (used by platforms to verify tool JWTs)
 */
>>>>>>> ed645f7 (feat(lti): implement LTI 1.3 login initiation + launch validation + deep linking)
@Controller('lti')
export class LtiController {
  private readonly logger = new Logger(LtiController.name);

  constructor(private readonly ltiService: LtiService) {}

<<<<<<< HEAD
  @Post('login')
  @HttpCode(HttpStatus.FOUND)
  async initiateLogin(
    @Body() body: LtiLoginBody,
    @Res() res: Response
  ): Promise<void> {
    if (!body.iss || !body.login_hint || !body.target_link_uri) {
      res.status(400).json({ error: 'Missing required LTI login params' });
      return;
    }

    const params: LtiLaunchParams = {
      iss: body.iss,
      login_hint: body.login_hint,
      target_link_uri: body.target_link_uri,
      lti_message_hint: body.lti_message_hint,
      client_id: body.client_id,
      deployment_id: body.deployment_id,
    };

    const { redirectUrl } = await this.ltiService.initiateLogin(params);
    this.logger.debug('Redirecting LTI login to platform auth URL');
    res.redirect(redirectUrl);
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(
    @Body() body: LtiCallbackBody,
    @Res() res: Response
  ): Promise<void> {
    if (!body.id_token || !body.state) {
      res.status(400).json({ error: 'Missing id_token or state' });
      return;
    }

    const result = await this.ltiService.handleCallback(
      body.id_token,
      body.state
    );
    this.logger.log('LTI callback success userId=' + result.userId);

    // Redirect to frontend with session token
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const target = result.courseId
      ? frontendUrl +
        '/courses/' +
        result.courseId +
        '?lti_token=' +
        result.sessionToken
      : frontendUrl + '/dashboard?lti_token=' + result.sessionToken;

    res.redirect(target);
  }

  @Get('jwks')
  getJwks(): object {
    // In production this would return platform's JWKS for LMS verification.
    // Stub for architecture completeness — real impl uses @panva/node-openid-client.
    return {
      keys: [],
    };
=======
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
    @Res() res: Response,
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
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log('LTI launch received');

    const claims = await this.ltiService.validateLaunch(body.id_token, body.state);
    const sessionToken = this.ltiService.createSession(claims);
    const targetPath = this.ltiService.resolveTargetUrl(claims);

    const frontendBase = process.env['TOOL_BASE_URL'] ?? 'http://localhost:5173';
    const redirectUrl = `${frontendBase}/lti/launch?lti_token=${sessionToken}&target=${encodeURIComponent(targetPath)}`;

    this.logger.log({ sub: claims.sub, targetPath }, 'LTI launch successful — redirecting');
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
>>>>>>> ed645f7 (feat(lti): implement LTI 1.3 login initiation + launch validation + deep linking)
  }
}
