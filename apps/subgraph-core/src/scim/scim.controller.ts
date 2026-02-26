import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ScimTokenService } from './scim-token.service.js';
import { ScimUserService } from './scim-user.service.js';
import { ScimGroupService } from './scim-group.service.js';
import type {
  ScimUser,
  ScimGroup,
  ScimError,
  ScimPatchRequest,
  ServiceProviderConfig,
} from './scim.types.js';

const _SCIM_USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';
const SCIM_GROUP_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Group';
const SCIM_LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';
const SCIM_ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error';
const SCIM_CT = 'application/scim+json';

@Controller('scim/v2')
export class ScimController {
  constructor(
    private readonly tokenService: ScimTokenService,
    private readonly userService: ScimUserService,
    private readonly groupService: ScimGroupService
  ) {}

  private scimError(res: Response, status: number, detail: string): void {
    const body: ScimError = { schemas: [SCIM_ERROR_SCHEMA], status, detail };
    res.status(status).type(SCIM_CT).json(body);
  }

  private async authorize(
    req: Request,
    res: Response
  ): Promise<{ tenantId: string; tokenId: string } | null> {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      this.scimError(res, HttpStatus.UNAUTHORIZED, 'Bearer token required');
      return null;
    }
    const raw = auth.slice(7);
    const result = await this.tokenService.validateToken(raw);
    if (!result) {
      this.scimError(res, HttpStatus.UNAUTHORIZED, 'Invalid or expired token');
      return null;
    }
    return result;
  }

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

  // ─── Users ────────────────────────────────────────────────────────────────

  @Get('Users')
  async listUsers(@Req() req: Request, @Res() res: Response): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    const startIndex = Number(req.query['startIndex'] ?? 1);
    const count = Math.min(Number(req.query['count'] ?? 100), 200);
    const { users, total } = await this.userService.listUsers(
      auth.tenantId,
      startIndex,
      count
    );
    res
      .status(200)
      .type(SCIM_CT)
      .json({
        schemas: [SCIM_LIST_SCHEMA],
        totalResults: total,
        startIndex,
        itemsPerPage: count,
        Resources: users,
      });
  }

  @Post('Users')
  async createUser(
    @Req() req: Request,
    @Body() body: ScimUser,
    @Res() res: Response
  ): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    if (!body.userName) {
      this.scimError(res, 400, 'userName is required');
      return;
    }
    const user = await this.userService.createUser(auth.tenantId, body);
    res.status(201).type(SCIM_CT).json(user);
  }

  @Get('Users/:id')
  async getUser(
    @Req() req: Request,
    @Param('id') id: string,
    @Res() res: Response
  ): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    const user = await this.userService.getUser(auth.tenantId, id);
    if (!user) {
      this.scimError(res, 404, 'User not found');
      return;
    }
    res.status(200).type(SCIM_CT).json(user);
  }

  @Put('Users/:id')
  async replaceUser(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: ScimUser,
    @Res() res: Response
  ): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    const user = await this.userService.replaceUser(auth.tenantId, id, body);
    if (!user) {
      this.scimError(res, 404, 'User not found');
      return;
    }
    res.status(200).type(SCIM_CT).json(user);
  }

  @Patch('Users/:id')
  async patchUser(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: ScimPatchRequest,
    @Res() res: Response
  ): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    const user = await this.userService.patchUser(
      auth.tenantId,
      id,
      body.Operations ?? []
    );
    if (!user) {
      this.scimError(res, 404, 'User not found');
      return;
    }
    res.status(200).type(SCIM_CT).json(user);
  }

  @Delete('Users/:id')
  async deleteUser(
    @Req() req: Request,
    @Param('id') id: string,
    @Res() res: Response
  ): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    await this.userService.deleteUser(auth.tenantId, id);
    res.status(204).send();
  }

  // ─── Groups ───────────────────────────────────────────────────────────────

  @Get('Groups')
  async listGroups(@Req() req: Request, @Res() res: Response): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    const startIndex = Number(req.query['startIndex'] ?? 1);
    const count = Math.min(Number(req.query['count'] ?? 100), 200);
    const filter = req.query['filter'] as string | undefined;
    const { groups, total } = await this.groupService.listGroups(
      auth.tenantId,
      startIndex,
      count,
      filter
    );
    res
      .status(200)
      .type(SCIM_CT)
      .json({
        schemas: [SCIM_LIST_SCHEMA],
        totalResults: total,
        startIndex,
        itemsPerPage: count,
        Resources: groups,
      });
  }

  @Post('Groups')
  async createGroup(
    @Req() req: Request,
    @Body() body: ScimGroup,
    @Res() res: Response
  ): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    if (!body.displayName) {
      this.scimError(res, 400, 'displayName is required');
      return;
    }
    const group = await this.groupService.createGroup(auth.tenantId, body);
    res.status(201).type(SCIM_CT).json(group);
  }

  @Get('Groups/:id')
  async getGroup(
    @Req() req: Request,
    @Param('id') id: string,
    @Res() res: Response
  ): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    try {
      const group = await this.groupService.getGroup(auth.tenantId, id);
      res.status(200).type(SCIM_CT).json(group);
    } catch {
      this.scimError(res, 404, 'Group not found');
    }
  }

  @Put('Groups/:id')
  async replaceGroup(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: ScimGroup,
    @Res() res: Response
  ): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    try {
      const group = await this.groupService.replaceGroup(
        auth.tenantId,
        id,
        body
      );
      res.status(200).type(SCIM_CT).json(group);
    } catch {
      this.scimError(res, 404, 'Group not found');
    }
  }

  @Patch('Groups/:id')
  async patchGroup(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: ScimPatchRequest,
    @Res() res: Response
  ): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    try {
      const group = await this.groupService.patchGroup(
        auth.tenantId,
        id,
        body.Operations ?? []
      );
      res.status(200).type(SCIM_CT).json(group);
    } catch {
      this.scimError(res, 404, 'Group not found');
    }
  }

  @Delete('Groups/:id')
  async deleteGroup(
    @Req() req: Request,
    @Param('id') id: string,
    @Res() res: Response
  ): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    try {
      await this.groupService.deleteGroup(auth.tenantId, id);
      res.status(204).send();
    } catch {
      this.scimError(res, 404, 'Group not found');
    }
  }
}
