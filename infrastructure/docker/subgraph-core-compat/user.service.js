'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
      return Reflect.metadata(k, v);
  };
var UserService_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.UserService = void 0;
const common_1 = require('@nestjs/common');
const db_1 = require('@edusphere/db');
const user_preferences_service_1 = require('./user-preferences.service');
let UserService = (UserService_1 = class UserService {
  constructor() {
    this.logger = new common_1.Logger(UserService_1.name);
    this.db = (0, db_1.createDatabaseConnection)();
  }
  async onModuleDestroy() {
    await (0, db_1.closeAllPools)();
  }
  toTenantContext(authContext) {
    return {
      tenantId: authContext.tenantId || '',
      userId: authContext.userId,
      userRole: authContext.roles[0] || 'STUDENT',
    };
  }
  mapUser(user) {
    if (!user) return null;
    const displayName = user['display_name'] || '';
    const parts = displayName.split(' ');
    const toIso = (v) => {
      if (!v) return new Date().toISOString();
      if (v instanceof Date) return v.toISOString();
      return String(v);
    };
    return {
      ...user,
      firstName: user['first_name'] || user['firstName'] || parts[0] || '',
      lastName:
        user['last_name'] || user['lastName'] || parts.slice(1).join(' ') || '',
      tenantId: user['tenant_id'] || user['tenantId'] || '',
      createdAt: toIso(user['created_at'] ?? user['createdAt']),
      updatedAt: toIso(user['updated_at'] ?? user['updatedAt']),
      preferences: (0, user_preferences_service_1.parsePreferences)(
        user['preferences']
      ),
    };
  }
  async findById(id, authContext) {
    if (authContext && authContext.tenantId) {
      const tenantCtx = this.toTenantContext(authContext);
      return (0, db_1.withTenantContext)(this.db, tenantCtx, async (tx) => {
        const [user] = await tx
          .select()
          .from(db_1.schema.users)
          .where((0, db_1.eq)(db_1.schema.users.id, id))
          .limit(1);
        return this.mapUser(user) || null;
      });
    }
    const [user] = await this.db
      .select()
      .from(db_1.schema.users)
      .where((0, db_1.eq)(db_1.schema.users.id, id))
      .limit(1);
    return this.mapUser(user) || null;
  }
  async findAll(limit, offset, authContext) {
    if (authContext && authContext.tenantId) {
      const tenantCtx = this.toTenantContext(authContext);
      return (0, db_1.withTenantContext)(this.db, tenantCtx, async (tx) => {
        const rows = await tx
          .select()
          .from(db_1.schema.users)
          .limit(limit)
          .offset(offset);
        return rows.map((u) => this.mapUser(u));
      });
    }
    const rows = await this.db
      .select()
      .from(db_1.schema.users)
      .limit(limit)
      .offset(offset);
    return rows.map((u) => this.mapUser(u));
  }
  async create(input, authContext) {
    const tenantCtx = this.toTenantContext(authContext);
    return (0, db_1.withTenantContext)(this.db, tenantCtx, async (tx) => {
      const displayName = [input.firstName || '', input.lastName || '']
        .join(' ')
        .trim();
      const insertValues = {
        tenant_id: input.tenantId || authContext.tenantId || '',
        email: input.email,
        first_name: input.firstName || '',
        last_name: input.lastName || '',
        display_name: displayName,
        ...(input.role && { role: input.role }),
      };
      const [user] = await tx
        .insert(db_1.schema.users)
        .values(insertValues)
        .returning();
      return this.mapUser(user);
    });
  }
  async update(id, input, authContext) {
    const tenantCtx = this.toTenantContext(authContext);
    return (0, db_1.withTenantContext)(this.db, tenantCtx, async (tx) => {
      const updateData = {};
      if (input.firstName !== undefined)
        updateData.first_name = input.firstName;
      if (input.lastName !== undefined) updateData.last_name = input.lastName;
      if (input.firstName || input.lastName) {
        updateData.display_name = [input.firstName || '', input.lastName || '']
          .join(' ')
          .trim();
      }
      if (input.role) updateData.role = input.role;
      const [user] = await tx
        .update(db_1.schema.users)
        .set(updateData)
        .where((0, db_1.eq)(db_1.schema.users.id, id))
        .returning();
      if (!user) throw new Error('User not found');
      return this.mapUser(user);
    });
  }
  async deactivateUser(id, authContext) {
    const tenantCtx = this.toTenantContext(authContext);
    return (0, db_1.withTenantContext)(this.db, tenantCtx, async (tx) => {
      await tx
        .update(db_1.schema.users)
        .set({ updated_at: new Date() })
        .where((0, db_1.eq)(db_1.schema.users.id, id));
      this.logger.log(
        { userId: id, tenantId: tenantCtx.tenantId },
        'User deactivated'
      );
      return true;
    });
  }
  async resetUserPassword(userId, authContext) {
    this.logger.log(
      { userId, tenantId: authContext.tenantId },
      'Password reset requested'
    );
    return true;
  }
  async bulkImportUsers(csvData, authContext) {
    const tenantCtx = this.toTenantContext(authContext);
    const lines = csvData.trim().split('\n');
    const headers = lines[0]?.split(',').map((h) => h.trim()) ?? [];
    let created = 0;
    const updated = 0;
    let failed = 0;
    const errors = [];
    for (let i = 1; i < lines.length; i++) {
      const rawValues = (lines[i] ?? '').split(',').map((v) => v.trim());
      const row = Object.fromEntries(
        headers.map((h, idx) => [h, rawValues[idx] ?? ''])
      );
      if (!row['email']) {
        errors.push('Row ' + String(i) + ': missing email');
        failed++;
        continue;
      }
      try {
        await this.create(
          {
            email: row['email'],
            firstName: row['firstName'] ?? row['first_name'] ?? '',
            lastName: row['lastName'] ?? row['last_name'] ?? '',
            role: row['role'] ?? 'STUDENT',
            tenantId: tenantCtx.tenantId,
          },
          authContext
        );
        created++;
      } catch (err) {
        errors.push('Row ' + String(i) + ': ' + String(err));
        failed++;
      }
    }
    this.logger.log(
      { created, updated, failed, tenantId: tenantCtx.tenantId },
      'Bulk import completed'
    );
    return { created, updated, failed, errors };
  }
  async adminUsers(opts, authContext) {
    const tenantCtx = this.toTenantContext(authContext);
    return (0, db_1.withTenantContext)(this.db, tenantCtx, async (tx) => {
      const rows = await (opts.role
        ? tx
            .select()
            .from(db_1.schema.users)
            .where((0, db_1.eq)(db_1.schema.users.role, opts.role))
            .limit(opts.limit)
            .offset(opts.offset)
        : tx
            .select()
            .from(db_1.schema.users)
            .limit(opts.limit)
            .offset(opts.offset));
      const countRows = await tx
        .select({ id: db_1.schema.users.id })
        .from(db_1.schema.users);
      return {
        users: rows.map((u) => this.mapUser(u)).filter((u) => u !== null),
        total: countRows.length,
      };
    });
  }
});
exports.UserService = UserService;
exports.UserService =
  UserService =
  UserService_1 =
    __decorate(
      [(0, common_1.Injectable)(), __metadata('design:paramtypes', [])],
      UserService
    );
//# sourceMappingURL=user.service.js.map
