import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { db, tenants } from '@edusphere/db';
import { eq } from 'drizzle-orm';
import type { UpdateTenantLanguageSettingsInput } from './tenant-language.schemas';

export interface TenantLanguageSettings {
  supportedLanguages: string[];
  defaultLanguage: string;
}

// All locales with translation files in packages/i18n/src/locales/
const ALL_LOCALES = ['en', 'zh-CN', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'id', 'he'];

const DEFAULT_SETTINGS: TenantLanguageSettings = {
  supportedLanguages: [...ALL_LOCALES],
  defaultLanguage: 'en',
};

export const LANG_CACHE_MAX_SIZE = 500;

export function parseLanguageSettings(raw: unknown): TenantLanguageSettings {
  const r = raw as Record<string, unknown> | null | undefined;
  if (!r || typeof r !== 'object' || Array.isArray(r)) return { ...DEFAULT_SETTINGS };

  const langs = r['supportedLanguages'];
  const def = r['defaultLanguage'];

  return {
    supportedLanguages:
      Array.isArray(langs) && langs.length > 0 ? (langs as string[]) : [...ALL_LOCALES],
    defaultLanguage: typeof def === 'string' && def.length > 0 ? def : 'en',
  };
}

@Injectable()
export class TenantLanguageService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantLanguageService.name);
  private readonly cache = new Map<string, { data: TenantLanguageSettings; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  onModuleDestroy(): void {
    this.cache.clear();
  }

  private setCached(key: string, value: { data: TenantLanguageSettings; expiresAt: number }): void {
    if (this.cache.size >= LANG_CACHE_MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  async getSettings(tenantId: string): Promise<TenantLanguageSettings> {
    const cached = this.cache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const rows = await db
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const data = parseLanguageSettings(rows[0]?.settings);
    this.setCached(tenantId, { data, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return data;
  }

  async updateSettings(
    tenantId: string,
    input: UpdateTenantLanguageSettingsInput,
  ): Promise<TenantLanguageSettings> {
    // Read current settings to preserve other keys stored in the JSONB
    const rows = await db
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const current = (rows[0]?.settings as Record<string, unknown>) ?? {};
    const merged: Record<string, unknown> = {
      ...current,
      supportedLanguages: input.supportedLanguages,
      defaultLanguage: input.defaultLanguage,
    };

    await db.update(tenants).set({ settings: merged }).where(eq(tenants.id, tenantId));

    this.cache.delete(tenantId);
    this.logger.log({ tenantId }, 'Tenant language settings updated');
    return this.getSettings(tenantId);
  }
}
