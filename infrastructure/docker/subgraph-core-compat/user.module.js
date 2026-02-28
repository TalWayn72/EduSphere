"use strict";
// Compatibility shim for Feb-20 image + new user services.
// Registers exactly the services available in this image's dist,
// plus the newly-mounted services (user-preferences.service.js).
// PublicProfileService and other Wave-2+ additions are omitted
// because their JS files do not exist in the Feb-20 image layer.
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModule = void 0;
const common_1 = require("@nestjs/common");
const user_resolver_1 = require("./user.resolver");
const user_service_1 = require("./user.service");
const user_stats_service_1 = require("./user-stats.service");
const user_preferences_service_1 = require("./user-preferences.service");
let UserModule = class UserModule {
};
exports.UserModule = UserModule;
exports.UserModule = UserModule = __decorate([
    (0, common_1.Module)({
        providers: [
            user_resolver_1.UserResolver,
            user_service_1.UserService,
            user_stats_service_1.UserStatsService,
            user_preferences_service_1.UserPreferencesService,
        ],
        exports: [
            user_service_1.UserService,
            user_stats_service_1.UserStatsService,
            user_preferences_service_1.UserPreferencesService,
        ],
    })
], UserModule);
//# sourceMappingURL=user.module.js.map
