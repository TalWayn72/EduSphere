import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Req, Res, HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ScimTokenService } from "./scim-token.service.js";
import { ScimUserService } from "./scim-user.service.js";
import type { ScimUser, ScimError, ScimPatchRequest, ServiceProviderConfig } from "./scim.types.js";

const _SCIM_USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
const SCIM_GROUP_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:Group";
const SCIM_LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse";
const SCIM_ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";
const SCIM_CT = "application/scim+json";

@Controller("scim/v2")
export class ScimController {
  constructor(
    private readonly tokenService: ScimTokenService,
    private readonly userService: ScimUserService,
  ) {}

  private scimError(res: Response, status: number, detail: string): void {
    const body: ScimError = { schemas: [SCIM_ERROR_SCHEMA], status, detail };
    res.status(status).type(SCIM_CT).json(body);
  }

  private async authorize(req: Request, res: Response): Promise<{ tenantId: string; tokenId: string } | null> {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) { this.scimError(res, HttpStatus.UNAUTHORIZED, "Bearer token required"); return null; }
    const raw = auth.slice(7);
    const result = await this.tokenService.validateToken(raw);
    if (!result) { this.scimError(res, HttpStatus.UNAUTHORIZED, "Invalid or expired token"); return null; }
    return result;
  }

  @Get("ServiceProviderConfig")
  getServiceProviderConfig(@Res() res: Response): void {
    const config: ServiceProviderConfig = {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
      patch: { supported: true },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 200 },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: false },
      authenticationSchemes: [{ type: "oauthbearertoken", name: "OAuth Bearer Token", description: "EduSphere SCIM token" }],
    };
    res.status(200).type(SCIM_CT).json(config);
  }

  @Get("Users")
  async listUsers(@Req() req: Request, @Res() res: Response): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    const startIndex = Number(req.query["startIndex"] ?? 1);
    const count = Math.min(Number(req.query["count"] ?? 100), 200);
    const { users, total } = await this.userService.listUsers(auth.tenantId, startIndex, count);
    res.status(200).type(SCIM_CT).json({ schemas: [SCIM_LIST_SCHEMA], totalResults: total, startIndex, itemsPerPage: count, Resources: users });
  }

  @Post("Users")
  async createUser(@Req() req: Request, @Body() body: ScimUser, @Res() res: Response): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    if (!body.userName) { this.scimError(res, 400, "userName is required"); return; }
    const user = await this.userService.createUser(auth.tenantId, body);
    res.status(201).type(SCIM_CT).json(user);
  }

  @Get("Users/:id")
  async getUser(@Req() req: Request, @Param("id") id: string, @Res() res: Response): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    const user = await this.userService.getUser(auth.tenantId, id);
    if (!user) { this.scimError(res, 404, "User not found"); return; }
    res.status(200).type(SCIM_CT).json(user);
  }

  @Put("Users/:id")
  async replaceUser(@Req() req: Request, @Param("id") id: string, @Body() body: ScimUser, @Res() res: Response): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    const user = await this.userService.replaceUser(auth.tenantId, id, body);
    if (!user) { this.scimError(res, 404, "User not found"); return; }
    res.status(200).type(SCIM_CT).json(user);
  }

  @Patch("Users/:id")
  async patchUser(@Req() req: Request, @Param("id") id: string, @Body() body: ScimPatchRequest, @Res() res: Response): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    const user = await this.userService.patchUser(auth.tenantId, id, body.Operations ?? []);
    if (!user) { this.scimError(res, 404, "User not found"); return; }
    res.status(200).type(SCIM_CT).json(user);
  }

  @Delete("Users/:id")
  async deleteUser(@Req() req: Request, @Param("id") id: string, @Res() res: Response): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    await this.userService.deleteUser(auth.tenantId, id);
    res.status(204).send();
  }

  @Get("Groups")
  async listGroups(@Req() req: Request, @Res() res: Response): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    res.status(200).type(SCIM_CT).json({ schemas: [SCIM_LIST_SCHEMA], totalResults: 0, startIndex: 1, itemsPerPage: 0, Resources: [] });
  }

  @Post("Groups")
  async createGroup(@Req() req: Request, @Body() body: Record<string, unknown>, @Res() res: Response): Promise<void> {
    const auth = await this.authorize(req, res);
    if (!auth) return;
    const ext = body["urn:edusphere:scim:extension"] as { courseIds?: string[] } | undefined;
    const members = (body["members"] as Array<{ value: string }> | undefined) ?? [];
    if (ext?.courseIds?.length && members.length > 0) {
      for (const member of members) {
        await this.userService.patchUser(auth.tenantId, member.value, []);
      }
    }
    const group = { schemas: [SCIM_GROUP_SCHEMA], id: crypto.randomUUID(), displayName: body["displayName"] ?? "" };
    res.status(201).type(SCIM_CT).json(group);
  }
}