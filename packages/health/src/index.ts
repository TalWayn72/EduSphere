import { Pool } from 'pg';
import Redis from 'ioredis';
import express, { Request, Response, Router } from 'express';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  latency?: number;
  timestamp: string;
}

export interface HealthReport {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  uptime: number;
  checks: HealthCheck[];
  timestamp: string;
}

export class HealthService {
  private startTime: number;
  private version: string;
  private pgPool?: Pool;
  private redis?: Redis;

  constructor(version: string = '1.0.0') {
    this.startTime = Date.now();
    this.version = version;
  }

  configurePG(connectionString: string) {
    this.pgPool = new Pool({ connectionString });
  }

  configureRedis(url: string) {
    this.redis = new Redis(url);
  }

  async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      if (!this.pgPool) {
        return {
          name: 'database',
          status: 'degraded',
          message: 'Database not configured',
          timestamp: new Date().toISOString(),
        };
      }

      const result = await this.pgPool.query('SELECT 1 as health');
      const latency = Date.now() - start;

      return {
        name: 'database',
        status: latency < 100 ? 'healthy' : 'degraded',
        message: result.rows[0].health === 1 ? 'Connected' : 'Query failed',
        latency,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async checkRedis(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      if (!this.redis) {
        return {
          name: 'redis',
          status: 'degraded',
          message: 'Redis not configured',
          timestamp: new Date().toISOString(),
        };
      }

      await this.redis.ping();
      const latency = Date.now() - start;

      return {
        name: 'redis',
        status: latency < 50 ? 'healthy' : 'degraded',
        message: 'Connected',
        latency,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async checkMemory(): Promise<HealthCheck> {
    const used = process.memoryUsage();
    const heapUsedMB = used.heapUsed / 1024 / 1024;
    const heapTotalMB = used.heapTotal / 1024 / 1024;
    const percentage = (heapUsedMB / heapTotalMB) * 100;

    return {
      name: 'memory',
      status: percentage < 80 ? 'healthy' : percentage < 90 ? 'degraded' : 'unhealthy',
      message: `${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB (${percentage.toFixed(1)}%)`,
      timestamp: new Date().toISOString(),
    };
  }

  async getHealthReport(): Promise<HealthReport> {
    const checks: HealthCheck[] = [];

    // Run health checks in parallel
    const [dbCheck, redisCheck, memoryCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
    ]);

    checks.push(dbCheck, redisCheck, memoryCheck);

    // Determine overall status
    const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
    const hasDegraded = checks.some(c => c.status === 'degraded');
    const status = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';

    return {
      status,
      version: this.version,
      uptime: Date.now() - this.startTime,
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  createHealthEndpoint(): Router {
    const router = express.Router();

    // Liveness probe
    router.get('/health/live', (req: Request, res: Response) => {
      res.json({ status: 'alive', timestamp: new Date().toISOString() });
    });

    // Readiness probe
    router.get('/health/ready', async (req: Request, res: Response) => {
      const report = await this.getHealthReport();
      const statusCode = report.status === 'healthy' ? 200 : report.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(report);
    });

    // Full health check
    router.get('/health', async (req: Request, res: Response) => {
      const report = await this.getHealthReport();
      const statusCode = report.status === 'healthy' ? 200 : report.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(report);
    });

    return router;
  }
}

export function createHealthService(version?: string): HealthService {
  return new HealthService(version);
}
