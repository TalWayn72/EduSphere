import Redis from 'ioredis';
import type { NestMiddleware, OnModuleDestroy } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 200;
const FALLBACK_MAP_MAX = 10_000;

@Injectable()
export class RateLimitMiddleware implements NestMiddleware, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private redis: Redis | null = null;
  private readonly fallback = new Map<string, { count: number; reset: number }>();

  constructor() {
    const redisUrl = process.env['REDIS_RATE_LIMIT_URL'] ?? process.env['REDIS_URL'];
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { lazyConnect: true, enableOfflineQueue: false });
      this.redis.on('error', (err: Error) => {
        this.logger.warn(
          { err: String(err) },
          '[RateLimitMiddleware] Redis unavailable — falling back to in-memory',
        );
        this.redis = null;
      });
    }
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const tenantId = (req.headers['x-tenant-id'] as string) ?? 'global';
    const ip = req.ip ?? 'unknown';
    // Hash-like key — do not embed raw tenant data in logs or metrics
    const key = `rate:${tenantId}:${ip}`;

    const allowed = this.redis
      ? await this.checkRedis(key)
      : this.checkFallback(key);

    if (!allowed) {
      res.status(429).json({ error: 'Too Many Requests', retryAfter: WINDOW_MS / 1000 });
      return;
    }
    next();
  }

  private async checkRedis(key: string): Promise<boolean> {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / WINDOW_MS)}`;
    try {
      const count = await this.redis!.incr(windowKey);
      if (count === 1) {
        await this.redis!.pexpire(windowKey, WINDOW_MS);
      }
      return count <= MAX_REQUESTS;
    } catch (err) {
      this.logger.warn({ err: String(err) }, '[RateLimitMiddleware] Redis incr failed — allowing request');
      return true;
    }
  }

  private checkFallback(key: string): boolean {
    const now = Date.now();
    const entry = this.fallback.get(key);
    if (!entry || now > entry.reset) {
      // Evict oldest entry if map exceeds max size (insertion-order LRU)
      if (this.fallback.size >= FALLBACK_MAP_MAX) {
        const oldest = this.fallback.keys().next().value;
        if (oldest !== undefined) {
          this.fallback.delete(oldest);
        }
      }
      this.fallback.set(key, { count: 1, reset: now + WINDOW_MS });
      return true;
    }
    entry.count++;
    return entry.count <= MAX_REQUESTS;
  }

  onModuleDestroy(): void {
    if (this.redis) {
      this.redis.disconnect();
      this.redis = null;
    }
    this.fallback.clear();
  }
}
