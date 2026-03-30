/**
 * ScimController — SCIM 2.0 ServiceProviderConfig endpoint + re-exports.
 * User and Group endpoints split into ScimUserController and ScimGroupController.
 */
import {
  Controller,
  Get,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ServiceProviderConfig } from './scim.types.js';

const SCIM_CT = 'application/scim+json';

@Controller('scim/v2')
export class ScimController {
  @Get('ServiceProviderConfig')
  getServiceProviderConfig(@Res() res: Response): void {
    const config: ServiceProviderConfig = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
      patch: { supported: true },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 200 },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: false },
      authenticationSchemes: [
        {
          type: 'oauthbearertoken',
          name: 'OAuth Bearer Token',
          description: 'EduSphere SCIM token',
        },
      ],
    };
    res.status(200).type(SCIM_CT).json(config);
  }
}
