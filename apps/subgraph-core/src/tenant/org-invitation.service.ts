/**
 * OrgInvitationService — Manages user invitations to organizations.
 *
 * Features:
 *   - Create invitation with token generation
 *   - Accept invitation (existing or new user)
 *   - Revoke invitation
 *   - List invitations with status filtering
 *   - Token expiry enforcement (7 days default)
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { randomBytes } from 'crypto';

export interface InviteUserInput {
  email: string;
  role: string;
  message?: string;
}

export interface OrgInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface OrgMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  joinedAt: Date;
  lastActiveAt: Date | null;
}

const INVITATION_EXPIRY_DAYS = 7;
const INVITE_SUBJECT = 'EDUSPHERE.org.user.invited';

@Injectable()
export class OrgInvitationService implements OnModuleDestroy {
  private readonly logger = new Logger(OrgInvitationService.name);
  private readonly db: Database;
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    await closeAllPools();
    this.logger.log('[OrgInvitationService] onModuleDestroy: cleaned up');
  }

  private async getNats(): Promise<NatsConnection> {
    if (!this.nc) {
      this.nc = await connect(buildNatsOptions());
    }
    return this.nc;
  }

  async inviteUser(
    input: InviteUserInput,
    ctx: TenantContext
  ): Promise<OrgInvitation> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const result = await withTenantContext(this.db, ctx, async (tx) => {
      // Check for existing pending invitation
      const existing = await tx.execute<{
        id: string;
        status: string;
      }>(sql`
        SELECT id, status FROM org_invitations
        WHERE tenant_id = ${ctx.tenantId}::uuid
          AND email = ${input.email}
          AND status = 'PENDING'
        LIMIT 1
      `);

      if (existing.rows.length > 0) {
        throw new BadRequestException('User already has a pending invitation');
      }

      const inserted = await tx.execute<{
        id: string;
        email: string;
        role: string;
        status: string;
        expires_at: Date;
        created_at: Date;
      }>(sql`
        INSERT INTO org_invitations (tenant_id, email, role, token, status, expires_at, message)
        VALUES (
          ${ctx.tenantId}::uuid,
          ${input.email},
          ${input.role},
          ${token},
          'PENDING',
          ${expiresAt.toISOString()}::timestamptz,
          ${input.message ?? null}
        )
        RETURNING id, email, role, status, expires_at, created_at
      `);

      return inserted.rows[0];
    });

    if (!result) {
      throw new BadRequestException('Failed to create invitation');
    }

    // Emit invitation event (fire-and-forget)
    this.emitInviteEvent(ctx.tenantId, input, token).catch((err) =>
      this.logger.warn(
        { err },
        '[OrgInvitationService] Failed to emit invite event'
      )
    );

    this.logger.log(
      { tenantId: ctx.tenantId, email: input.email, role: input.role },
      '[OrgInvitationService] Invitation created'
    );

    return {
      id: result.id,
      email: result.email,
      role: result.role,
      status: result.status,
      expiresAt: new Date(result.expires_at),
      createdAt: new Date(result.created_at),
    };
  }

  async acceptInvitation(token: string): Promise<OrgMember> {
    const result = await this.db.execute<{
      id: string;
      tenant_id: string;
      email: string;
      role: string;
      status: string;
      expires_at: Date;
    }>(sql`
      SELECT id, tenant_id, email, role, status, expires_at
      FROM org_invitations
      WHERE token = ${token}
      LIMIT 1
    `);

    const invitation = result.rows[0];
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(
        `Invitation already ${invitation.status.toLowerCase()}`
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await this.db.execute(sql`
        UPDATE org_invitations SET status = 'EXPIRED'
        WHERE id = ${invitation.id}::uuid
      `);
      throw new BadRequestException('Invitation has expired');
    }

    // Mark invitation as accepted
    await this.db.execute(sql`
      UPDATE org_invitations SET status = 'ACCEPTED', updated_at = NOW()
      WHERE id = ${invitation.id}::uuid
    `);

    this.logger.log(
      { tenantId: invitation.tenant_id, email: invitation.email },
      '[OrgInvitationService] Invitation accepted'
    );

    return {
      id: invitation.id,
      email: invitation.email,
      name: null,
      role: invitation.role,
      joinedAt: new Date(),
      lastActiveAt: null,
    };
  }

  async revokeInvitation(id: string, ctx: TenantContext): Promise<boolean> {
    await withTenantContext(this.db, ctx, async (tx) => {
      await tx.execute(sql`
        UPDATE org_invitations
        SET status = 'REVOKED', updated_at = NOW()
        WHERE id = ${id}::uuid
          AND tenant_id = ${ctx.tenantId}::uuid
          AND status = 'PENDING'
      `);
    });

    this.logger.log(
      { tenantId: ctx.tenantId, invitationId: id },
      '[OrgInvitationService] Invitation revoked'
    );
    return true;
  }

  async getInvitations(
    ctx: TenantContext,
    status?: string
  ): Promise<OrgInvitation[]> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const statusFilter = status ? sql`AND status = ${status}` : sql``;

      const result = await tx.execute<{
        id: string;
        email: string;
        role: string;
        status: string;
        expires_at: Date;
        created_at: Date;
      }>(sql`
        SELECT id, email, role, status, expires_at, created_at
        FROM org_invitations
        WHERE tenant_id = ${ctx.tenantId}::uuid
        ${statusFilter}
        ORDER BY created_at DESC
      `);

      return result.rows.map((r) => ({
        id: r.id,
        email: r.email,
        role: r.role,
        status: r.status,
        expiresAt: new Date(r.expires_at),
        createdAt: new Date(r.created_at),
      }));
    });
  }

  private async emitInviteEvent(
    tenantId: string,
    input: InviteUserInput,
    token: string
  ): Promise<void> {
    const nc = await this.getNats();
    nc.publish(
      INVITE_SUBJECT,
      this.sc.encode(
        JSON.stringify({
          tenantId,
          email: input.email,
          role: input.role,
          token,
          timestamp: new Date().toISOString(),
        })
      )
    );
  }
}
