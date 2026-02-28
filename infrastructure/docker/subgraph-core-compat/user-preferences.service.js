"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UserPreferencesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserPreferencesService = void 0;
exports.parsePreferences = parsePreferences;
const common_1 = require("@nestjs/common");
const db_1 = require("@edusphere/db");
function parsePreferences(raw) {
    const r = raw ?? {};
    return {
        locale: r['locale'] ?? 'en',
        theme: r['theme'] ?? 'system',
        emailNotifications: r['emailNotifications'] ?? true,
        pushNotifications: r['pushNotifications'] ?? true,
        isPublicProfile: r['isPublicProfile'] ?? false,
    };
}
let UserPreferencesService = UserPreferencesService_1 = class UserPreferencesService {
    constructor() {
        this.logger = new common_1.Logger(UserPreferencesService_1.name);
        this.db = (0, db_1.createDatabaseConnection)();
    }
    async onModuleDestroy() {
        await (0, db_1.closeAllPools)();
    }
    toTenantContext(authContext) {
        return {
            tenantId: authContext.tenantId || '',
            userId: authContext.userId,
            userRole: (authContext.roles[0] || 'STUDENT'),
        };
    }
    async updatePreferences(id, input, authContext) {
        const tenantCtx = this.toTenantContext(authContext);
        return (0, db_1.withTenantContext)(this.db, tenantCtx, async (tx) => {
            const [existing] = await tx
                .select({ preferences: db_1.schema.users.preferences })
                .from(db_1.schema.users)
                .where((0, db_1.eq)(db_1.schema.users.id, id))
                .limit(1);
            if (!existing) {
                throw new common_1.NotFoundException(`User ${id} not found`);
            }
            const current = parsePreferences(existing.preferences);
            const merged = {
                locale: input.locale ?? current.locale,
                theme: input.theme ?? current.theme,
                emailNotifications: input.emailNotifications ?? current.emailNotifications,
                pushNotifications: input.pushNotifications ?? current.pushNotifications,
                isPublicProfile: current.isPublicProfile,
            };
            const [updated] = await tx
                .update(db_1.schema.users)
                .set({ preferences: merged })
                .where((0, db_1.eq)(db_1.schema.users.id, id))
                .returning();
            if (!updated) {
                throw new common_1.NotFoundException(`User ${id} not found`);
            }
            this.logger.debug({ userId: id, tenantId: authContext.tenantId }, 'updatePreferences committed');
            return updated;
        });
    }
    async updateProfileVisibility(id, isPublic, authContext) {
        const tenantCtx = this.toTenantContext(authContext);
        return (0, db_1.withTenantContext)(this.db, tenantCtx, async (tx) => {
            const [existing] = await tx
                .select({ preferences: db_1.schema.users.preferences })
                .from(db_1.schema.users)
                .where((0, db_1.eq)(db_1.schema.users.id, id))
                .limit(1);
            if (!existing) {
                throw new common_1.NotFoundException(`User ${id} not found`);
            }
            const current = parsePreferences(existing.preferences);
            const merged = { ...current, isPublicProfile: isPublic };
            const [updated] = await tx
                .update(db_1.schema.users)
                .set({ preferences: merged })
                .where((0, db_1.eq)(db_1.schema.users.id, id))
                .returning();
            if (!updated) {
                throw new common_1.NotFoundException(`User ${id} not found`);
            }
            this.logger.log({ userId: id, isPublic }, 'updateProfileVisibility committed');
            return parsePreferences(updated.preferences);
        });
    }
};
exports.UserPreferencesService = UserPreferencesService;
exports.UserPreferencesService = UserPreferencesService = UserPreferencesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], UserPreferencesService);
//# sourceMappingURL=user-preferences.service.js.map