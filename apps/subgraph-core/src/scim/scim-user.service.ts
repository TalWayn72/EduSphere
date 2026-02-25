/**
 * ScimUserService: SCIM 2.0 user provisioning.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { createDatabaseConnection, closeAllPools, schema, withTenantContext, eq, and, sql } from "@edusphere/db";
import type { Database, TenantContext } from "@edusphere/db";
import { connect, type NatsConnection } from "nats";
import { buildNatsOptions } from "@edusphere/nats-client";
import type { ScimUser, ScimPatchOp } from "./scim.types.js";

@Injectable()
export class ScimUserService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScimUserService.name);
  private readonly db: Database;
  private nats: NatsConnection | null = null;
  constructor() { this.db = createDatabaseConnection(); }

  async onModuleInit(): Promise<void> {
    try { this.nats = await connect(buildNatsOptions()); this.logger.log("ScimUserService: NATS connected"); }
    catch (err) { this.logger.warn({ err }, "ScimUserService: NATS unavailable"); }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.nats) { await this.nats.drain(); this.nats = null; }
    await closeAllPools();
  }

  async listUsers(tenantId: string, startIndex = 1, count = 100): Promise<{ users: ScimUser[]; total: number }> {
    const ctx: TenantContext = { tenantId, userId: "system", userRole: "ORG_ADMIN" };
    return withTenantContext(this.db, ctx, async (tx) => {
      const offset = Math.max(0, startIndex - 1);
      const rows = await tx.select().from(schema.users).where(eq(schema.users.tenant_id, tenantId)).limit(count).offset(offset);
      const countRows = await tx.execute<{ count: string }>(sql`SELECT COUNT(*)::text AS count FROM users WHERE tenant_id = ${tenantId}::uuid`);
      const total = Number(countRows.rows[0]?.count ?? 0);
      return { users: rows.map((r) => this.toScimUser(r)), total };
    });
  }

  async getUser(tenantId: string, userId: string): Promise<ScimUser | null> {
    const ctx: TenantContext = { tenantId, userId: "system", userRole: "ORG_ADMIN" };
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select().from(schema.users).where(and(eq(schema.users.id, userId), eq(schema.users.tenant_id, tenantId))).limit(1),
    );
    return rows[0] ? this.toScimUser(rows[0]) : null;
  }

  async createUser(tenantId: string, scimUser: ScimUser): Promise<ScimUser> {
    const ctx: TenantContext = { tenantId, userId: "system", userRole: "ORG_ADMIN" };
    const email = scimUser.emails?.find((e) => e.primary)?.value ?? scimUser.emails?.[0]?.value ?? scimUser.userName;
    const ext = scimUser["urn:edusphere:scim:extension"];
    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      const inserted = await tx.insert(schema.users).values({
        email,
        first_name: scimUser.name?.givenName ?? "",
        last_name: scimUser.name?.familyName ?? "",
        role: (ext?.role as typeof schema.users.$inferSelect["role"]) ?? "STUDENT",
        tenant_id: tenantId,
      }).returning();
      await tx.insert(schema.scimSyncLog).values({
        tenantId, operation: "CREATE_USER", externalId: scimUser.externalId,
        status: "SUCCESS", affectedUserId: inserted[0]?.id,
        syncData: scimUser as unknown as Record<string, unknown>,
      });
      return inserted;
    });
    const created = rows[0];
    if (!created) throw new Error("Failed to create user");
    this.publishEvent("EDUSPHERE.user.created", { userId: created.id, tenantId, email });
    if (ext?.courseIds?.length) this.publishEvent("EDUSPHERE.scim.enrollment", { userId: created.id, tenantId, courseIds: ext.courseIds });
    this.logger.log({ tenantId, email }, "SCIM: user created");
    return this.toScimUser(created);
  }

  async replaceUser(tenantId: string, userId: string, scimUser: ScimUser): Promise<ScimUser | null> {
    const ctx: TenantContext = { tenantId, userId: "system", userRole: "ORG_ADMIN" };
    const email = scimUser.emails?.find((e) => e.primary)?.value ?? scimUser.emails?.[0]?.value ?? scimUser.userName;
    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      const updated = await tx.update(schema.users)
        .set({ email, first_name: scimUser.name?.givenName ?? "", last_name: scimUser.name?.familyName ?? "" })
        .where(and(eq(schema.users.id, userId), eq(schema.users.tenant_id, tenantId))).returning();
      if (updated.length > 0) {
        await tx.insert(schema.scimSyncLog).values({
          tenantId, operation: "UPDATE_USER", externalId: scimUser.externalId,
          status: "SUCCESS", affectedUserId: userId, syncData: scimUser as unknown as Record<string, unknown>,
        });
      }
      return updated;
    });
    return rows[0] ? this.toScimUser(rows[0]) : null;
  }

  async patchUser(tenantId: string, userId: string, operations: ScimPatchOp[]): Promise<ScimUser | null> {
    const ctx: TenantContext = { tenantId, userId: "system", userRole: "ORG_ADMIN" };
    for (const op of operations) {
      if (!op.path || (op.op !== "replace" && op.op !== "add")) continue;
      const updates = this.patchToUpdates(op);
      if (Object.keys(updates).length === 0) continue;
      await withTenantContext(this.db, ctx, async (tx) =>
        tx.update(schema.users).set(updates).where(and(eq(schema.users.id, userId), eq(schema.users.tenant_id, tenantId))),
      );
    }
    await withTenantContext(this.db, ctx, async (tx) =>
      tx.insert(schema.scimSyncLog).values({
        tenantId, operation: "UPDATE_USER", status: "SUCCESS", affectedUserId: userId,
        syncData: operations as unknown as Record<string, unknown>,
      }),
    );
    return this.getUser(tenantId, userId);
  }

  async deleteUser(tenantId: string, userId: string): Promise<void> {
    const ctx: TenantContext = { tenantId, userId: "system", userRole: "ORG_ADMIN" };
    await withTenantContext(this.db, ctx, async (tx) =>
      tx.insert(schema.scimSyncLog).values({ tenantId, operation: "DELETE_USER", status: "SUCCESS", affectedUserId: userId }),
    );
    this.publishEvent("EDUSPHERE.user.deprovisioned", { userId, tenantId });
    this.logger.log({ tenantId, userId }, "SCIM: user deprovisioned");
  }

  private patchToUpdates(op: ScimPatchOp): Partial<typeof schema.users.$inferInsert> {
    const updates: Partial<typeof schema.users.$inferInsert> = {};
    if (op.path === "name.givenName") updates.first_name = String(op.value ?? "");
    if (op.path === "name.familyName") updates.last_name = String(op.value ?? "");
    if (op.path === "emails[type eq \"work\"].value") updates.email = String(op.value ?? "");
    return updates;
  }

  private toScimUser(row: typeof schema.users.$inferSelect): ScimUser {
    return {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      id: row.id, userName: row.email,
      name: { givenName: row.first_name, familyName: row.last_name },
      emails: [{ value: row.email, primary: true, type: "work" }],
      active: true,
    };
  }

  private publishEvent(subject: string, payload: Record<string, unknown>): void {
    if (!this.nats) return;
    try { this.nats.publish(subject, new TextEncoder().encode(JSON.stringify(payload))); }
    catch (err) { this.logger.error({ err, subject }, "NATS publish failed"); }
  }
}
