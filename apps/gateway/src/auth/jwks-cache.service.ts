import { Injectable, OnModuleDestroy } from '@nestjs/common';

interface JwksCacheEntry {
  keys: unknown[];
  expiresAt: number;
}

@Injectable()
export class JwksCacheService implements OnModuleDestroy {
  private readonly cache = new Map<string, JwksCacheEntry>();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_ENTRIES = 10;

  get(url: string): unknown[] | null {
    const entry = this.cache.get(url);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(url);
      return null;
    }
    return entry.keys;
  }

  set(url: string, keys: unknown[]): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(url, { keys, expiresAt: Date.now() + this.TTL_MS });
  }

  onModuleDestroy(): void {
    this.cache.clear();
  }
}
