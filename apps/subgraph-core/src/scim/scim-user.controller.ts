/**
 * ScimUserController — SCIM 2.0 User endpoints.
 * Extracted from ScimController to keep files under 300 lines.
 */
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
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ScimAuthHelper } from './scim-auth.helper.js';
import { ScimUserService } from './scim-user.service.js';
import type { ScimUser, ScimPatchRequest } from './scim.types.js';

const SCIM_LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';
const SCIM_CT = 'application/scim+json';

@Controller('scim/v2')
export class ScimUserController {
  constructor(
    private readonly auth: ScimAuthHelper,
    private readonly userService: ScimUserService
  ) {}

  @Get('Users')
  async listUsers(@Req() req: Request, @Res() res: Response): Promise<void> {
    const authResult = await this.auth.authorize(req, res);
    if (!authResult) return;
    const startIndex = Number(req.query['startIndex'] ?? 1);
    const count = Math.min(Number(req.query['count'] ?? 100), 200);
    const { users, total } = await this.userService.listUsers(
      authResult.tenantId,
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
    const authResult = await this.auth.authorize(req, res);
    if (!authResult) return;
    if (!body.userName) {
      this.auth.scimError(res, 400, 'userName is required');
      return;
    }
    const user = await this.userService.createUser(authResult.tenantId, body);
    res.status(201).type(SCIM_CT).json(user);
  }

  @Get('Users/:id')
  async getUser(
    @Req() req: Request,
    @Param('id') id: string,
    @Res() res: Response
  ): Promise<void> {
    const authResult = await this.auth.authorize(req, res);
    if (!authResult) return;
    const user = await this.userService.getUser(authResult.tenantId, id);
    if (!user) {
      this.auth.scimError(res, 404, 'User not found');
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
    const authResult = await this.auth.authorize(req, res);
    if (!authResult) return;
    const user = await this.userService.replaceUser(
      authResult.tenantId,
      id,
      body
    );
    if (!user) {
      this.auth.scimError(res, 404, 'User not found');
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
    const authResult = await this.auth.authorize(req, res);
    if (!authResult) return;
    const user = await this.userService.patchUser(
      authResult.tenantId,
      id,
      body.Operations ?? []
    );
    if (!user) {
      this.auth.scimError(res, 404, 'User not found');
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
    const authResult = await this.auth.authorize(req, res);
    if (!authResult) return;
    await this.userService.deleteUser(authResult.tenantId, id);
    res.status(204).send();
  }
}
