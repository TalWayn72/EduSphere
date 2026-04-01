/**
 * ScimGroupMemberService: SCIM 2.0 group member management.
 * Handles patch operations (add/remove/replace members) on SCIM groups.
 * Extracted from ScimGroupService to keep files under 300 lines.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  withTenantContext,
  eq,
  and,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import type { ScimGroup, ScimPatchOp } from './scim.types.js';
import { ScimGroupService } from './scim-group.service.js';

@Injectable()
export class ScimGroupMemberService {
  private readonly logger = new Logger(ScimGroupMemberService.name);
  private readonly db: Database;

  constructor(private readonly groupService: ScimGroupService) {
    this.db = createDatabaseConnection();
  }

  async patchGroup(
    tenantId: string,
    groupId: string,
    operations: ScimPatchOp[]
  ): Promise<ScimGroup> {
    const current = await this.groupService.getGroup(tenantId, groupId);
    const currentMemberIds = (current.members ?? []).map((m) => m.value);
    const currentCourseIds =
      current['urn:edusphere:scim:extension']?.courseIds ?? [];

    let memberIds = [...currentMemberIds];
    let displayName = current.displayName;
    const courseIds = [...currentCourseIds];

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
        if (courseIds.length > 0 && toAdd.length > 0) {
          this.groupService.publishEvent('EDUSPHERE.scim.group.enrollment', {
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
    return this.groupService.toScimGroup(rows[0]);
  }
}
