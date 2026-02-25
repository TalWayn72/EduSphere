/**
 * LtiController — HTTP endpoints for LTI 1.3 OIDC flow.
 * POST /lti/login     — OIDC login initiation (called by LMS, PUBLIC)
 * POST /lti/callback  — JWT id_token callback (PUBLIC)
 * GET  /lti/jwks      — Platform's public JWKS (PUBLIC)
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

@Controller('lti')
export class LtiController {
  private readonly logger = new Logger(LtiController.name);

  constructor(private readonly ltiService: LtiService) {}

  @Post('login')
  @HttpCode(HttpStatus.FOUND)
  async initiateLogin(
    @Body() body: LtiLoginBody,
    @Res() res: Response,
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
    @Res() res: Response,
  ): Promise<void> {
    if (!body.id_token || !body.state) {
      res.status(400).json({ error: 'Missing id_token or state' });
      return;
    }

    const result = await this.ltiService.handleCallback(body.id_token, body.state);
    this.logger.log('LTI callback success userId=' + result.userId);

    // Redirect to frontend with session token
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const target = result.courseId
      ? frontendUrl + '/courses/' + result.courseId + '?lti_token=' + result.sessionToken
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
  }
}
