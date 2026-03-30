/**
 * ScimGroupController — SCIM 2.0 Group endpoints.
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
import { ScimGroupService } from './scim-group.service.js';
import { ScimGroupMemberService } from './scim-group-member.service.js';
import type { ScimGroup, ScimPatchRequest } from './scim.types.js';

const SCIM_LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';
const SCIM_CT = 'application/scim+json';

@Controller('scim/v2')
export class ScimGroupController {
  constructor(
    private readonly auth: ScimAuthHelper,
    private readonly groupService: ScimGroupService,
    private readonly memberService: ScimGroupMemberService
  ) {}

  @Get('Groups')
  async listGroups(@Req() req: Request, @Res() res: Response): Promise<void> {
    const authResult = await this.auth.authorize(req, res);
    if (!authResult) return;
    const startIndex = Number(req.query['startIndex'] ?? 1);
    const count = Math.min(Number(req.query['count'] ?? 100), 200);
    const filter = req.query['filter'] as string | undefined;
    const { groups, total } = await this.groupService.listGroups(
      authResult.tenantId,
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
    const authResult = await this.auth.authorize(req, res);
    if (!authResult) return;
    if (!body.displayName) {
      this.auth.scimError(res, 400, 'displayName is required');
      return;
    }
    const group = await this.groupService.createGroup(authResult.tenantId, body);
    res.status(201).type(SCIM_CT).json(group);
  }

  @Get('Groups/:id')
  async getGroup(
    @Req() req: Request,
    @Param('id') id: string,
    @Res() res: Response
  ): Promise<void> {
    const authResult = await this.auth.authorize(req, res);
    if (!authResult) return;
    try {
      const group = await this.groupService.getGroup(authResult.tenantId, id);
      res.status(200).type(SCIM_CT).json(group);
    } catch {
      this.auth.scimError(res, 404, 'Group not found');
    }
  }

  @Put('Groups/:id')
  async replaceGroup(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: ScimGroup,
    @Res() res: Response
  ): Promise<void> {
    const authResult = await this.auth.authorize(req, res);
    if (!authResult) return;
    try {
      const group = await this.groupService.replaceGroup(
        authResult.tenantId,
        id,
        body
      );
      res.status(200).type(SCIM_CT).json(group);
    } catch {
      this.auth.scimError(res, 404, 'Group not found');
    }
  }

  @Patch('Groups/:id')
  async patchGroup(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: ScimPatchRequest,
    @Res() res: Response
  ): Promise<void> {
    const authResult = await this.auth.authorize(req, res);
    if (!authResult) return;
    try {
      const group = await this.memberService.patchGroup(
        authResult.tenantId,
        id,
        body.Operations ?? []
      );
      res.status(200).type(SCIM_CT).json(group);
    } catch {
      this.auth.scimError(res, 404, 'Group not found');
    }
  }

  @Delete('Groups/:id')
  async deleteGroup(
    @Req() req: Request,
    @Param('id') id: string,
    @Res() res: Response
  ): Promise<void> {
    const authResult = await this.auth.authorize(req, res);
    if (!authResult) return;
    try {
      await this.groupService.deleteGroup(authResult.tenantId, id);
      res.status(204).send();
    } catch {
      this.auth.scimError(res, 404, 'Group not found');
    }
  }
}
