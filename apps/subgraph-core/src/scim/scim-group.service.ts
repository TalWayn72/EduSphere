/**
 * ScimGroupService: SCIM 2.0 group provisioning (RFC 7643 §4.2).
 * Manages scim_groups table — create, read, update, patch, delete.
 * All DB queries via Drizzle with withTenantContext() for RLS enforcement.
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  withTenantContext,
  eq,
  and,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { connect, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import type { ScimGroup, ScimPatchOp } from './scim.types.js';

const SCIM_GROUP_SCHEMA =
  'urn:ietf:params:scim:schemas:core:2.0:Group' as const;

@Injectable()
export class ScimGroupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScimGroupService.name);
  private readonly db: Database;
  private nats: NatsConnection | null = null;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleInit(): Promise<void> {
    try {
      this.nats = await connect(buildNatsOptions());
      this.logger.log('ScimGroupService: NATS connected');
    } catch (err) {
      this.logger.warn({ err }, 'ScimGroupService: NATS unavailable');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.nats) {
      await this.nats.drain();
      this.nats = null;
    }
    await closeAllPools();
  }

  async listGroups(
    tenantId: string,
    startIndex = 1,
    count = 100,
    filter?: string
  ): Promise<{ groups: ScimGroup[]; total: number }> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'ORG_ADMIN',
    };
    return withTenantContext(this.db, ctx, async (tx) => {
      const offset = Math.max(0, startIndex - 1);
      let query = tx
        .select()
        .from(schema.scimGroups)
        .where(eq(schema.scimGroups.tenantId, tenantId));

      if (filter) {
        const match = /displayName eq "([^"]+)"/i.exec(filter);
        if (match?.[1]) {
          query = tx
            .select()
            .from(schema.scimGroups)
            .where(
              and(
                eq(schema.scimGroups.tenantId, tenantId),
                eq(schema.scimGroups.displayName, match[1])
              )
            );
        }
      }

      const rows = await query.limit(count).offset(offset);
      const countRows = await tx.execute<{ count: string }>(
        sql`SELECT COUNT(*)::text AS count FROM scim_groups WHERE tenant_id = ${tenantId}::uuid`
      );
      const total = Number(countRows.rows[0]?.count ?? 0);
      return { groups: rows.map((r) => this.toScimGroup(r)), total };
    });
  }

  async createGroup(tenantId: string, body: ScimGroup): Promise<ScimGroup> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'ORG_ADMIN',
    };
    const memberIds = (body.members ?? []).map((m) => m.value);
    const courseIds = body['urn:edusphere:scim:extension']?.courseIds ?? [];

    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .insert(schema.scimGroups)
        .values({
          tenantId,
          externalId: body.externalId,
          displayName: body.displayName,
          memberIds,
          courseIds,
        })
        .returning()
    );

    const created = rows[0];
    if (!created) throw new Error('Failed to create SCIM group');

    if (courseIds.length > 0 && memberIds.length > 0) {
      this.publishEvent('EDUSPHERE.scim.group.enrollment', {
        groupId: created.id,
        tenantId,
        memberIds,
        courseIds,
      });
    }
    this.logger.log(
      { tenantId, displayName: body.displayName },
      'SCIM: group created'
    );
    return this.toScimGroup(created);
  }

  async getGroup(tenantId: string, groupId: string): Promise<ScimGroup> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'ORG_ADMIN',
    };
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.scimGroups)
        .where(
          and(
            eq(schema.scimGroups.id, groupId),
            eq(schema.scimGroups.tenantId, tenantId)
          )
        )
        .limit(1)
    );
    if (!rows[0]) throw new NotFoundException(`Group ${groupId} not found`);
    return this.toScimGroup(rows[0]);
  }

  async replaceGroup(
    tenantId: string,
    groupId: string,
    body: ScimGroup
  ): Promise<ScimGroup> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'ORG_ADMIN',
    };
    const memberIds = (body.members ?? []).map((m) => m.value);
    const courseIds = body['urn:edusphere:scim:extension']?.courseIds ?? [];

    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .update(schema.scimGroups)
        .set({
          externalId: body.externalId,
          displayName: body.displayName,
          memberIds,
          courseIds,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.scimGroups.id, groupId),
            eq(schema.scimGroups.tenantId, tenantId)
          )
        )
        .returning()
    );
    if (!rows[0]) throw new NotFoundException(`Group ${groupId} not found`);
    this.logger.log({ tenantId, groupId }, 'SCIM: group replaced');
    return this.toScimGroup(rows[0]);
  }

  async patchGroup(
    tenantId: string,
    groupId: string,
    operations: ScimPatchOp[]
  ): Promise<ScimGroup> {
    // Fetch current group first to apply incremental patch
    const current = await this.getGroup(tenantId, groupId);
    const currentMemberIds = (current.members ?? []).map((m) => m.value);
    const currentCourseIds =
      current['urn:edusphere:scim:extension']?.courseIds ?? [];

    let memberIds = [...currentMemberIds];
    let displayName = current.displayName;
    let courseIds = [...currentCourseIds];

    for (const op of operations) {
      if (op.op === 'replace' && op.path === 'displayName') {
        displayName = String(op.value ?? displayName);
      } else if (op.op === 'replace' && op.path === 'members') {
        const vals = op.value as Array<{ value: string }> | undefined;
        memberIds = (vals ?? []).map((m) => m.value);
      } else if (op.op === 'add' && op.path === 'members') {
        const vals = op.value as Array<{ value: string }> | undefined;
        const toAdd = (vals ?? []).map((m) => m.value);
        memberIds = [...new Set([...memberIds, ...toAdd])];
        // Emit enrollment event for newly added members
        if (courseIds.length > 0 && toAdd.length > 0) {
          this.publishEvent('EDUSPHERE.scim.group.enrollment', {
            groupId,
            tenantId,
            memberIds: toAdd,
            courseIds,
          });
        }
      } else if (op.op === 'remove' && op.path === 'members') {
        const vals = op.value as Array<{ value: string }> | undefined;
        if (vals && vals.length > 0) {
          const toRemove = new Set(vals.map((m) => m.value));
          memberIds = memberIds.filter((id) => !toRemove.has(id));
        } else {
          memberIds = [];
        }
      }
    }

    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'ORG_ADMIN',
    };
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .update(schema.scimGroups)
        .set({ displayName, memberIds, courseIds, updatedAt: new Date() })
        .where(
          and(
            eq(schema.scimGroups.id, groupId),
            eq(schema.scimGroups.tenantId, tenantId)
          )
        )
        .returning()
    );
    if (!rows[0]) throw new NotFoundException(`Group ${groupId} not found`);
    this.logger.log({ tenantId, groupId }, 'SCIM: group patched');
    return this.toScimGroup(rows[0]);
  }

  async deleteGroup(tenantId: string, groupId: string): Promise<void> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'ORG_ADMIN',
    };
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .delete(schema.scimGroups)
        .where(
          and(
            eq(schema.scimGroups.id, groupId),
            eq(schema.scimGroups.tenantId, tenantId)
          )
        )
        .returning({ id: schema.scimGroups.id })
    );
    if (!rows[0]) throw new NotFoundException(`Group ${groupId} not found`);
    this.publishEvent('EDUSPHERE.scim.group.deleted', { groupId, tenantId });
    this.logger.log({ tenantId, groupId }, 'SCIM: group deleted');
  }

  private toScimGroup(row: typeof schema.scimGroups.$inferSelect): ScimGroup {
    const memberIds = (row.memberIds as string[] | null) ?? [];
    const courseIds = (row.courseIds as string[] | null) ?? [];
    return {
      schemas: [SCIM_GROUP_SCHEMA],
      id: row.id,
      externalId: row.externalId ?? undefined,
      displayName: row.displayName,
      members: memberIds.map((id) => ({ value: id })),
      'urn:edusphere:scim:extension':
        courseIds.length > 0 ? { courseIds } : undefined,
    };
  }

  private publishEvent(
    subject: string,
    payload: Record<string, unknown>
  ): void {
    if (!this.nats) return;
    try {
      this.nats.publish(
        subject,
        new TextEncoder().encode(JSON.stringify(payload))
      );
    } catch (err) {
      this.logger.error({ err, subject }, 'NATS publish failed');
    }
  }
}
