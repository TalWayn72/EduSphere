import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { fork, type ChildProcess } from 'child_process';
import { join } from 'path';
import type {
  SandboxConfig,
  SandboxResponse,
  WorkerMessage,
  WorkerStartMessage,
} from './sandbox.types.js';

/** Environment-driven defaults */
const DEFAULT_MAX_MEMORY_MB = parseInt(
  process.env.AGENT_MAX_MEMORY_MB ?? '256',
  10
);
const DEFAULT_TIMEOUT_MS = parseInt(
  process.env.AGENT_TIMEOUT_MS ?? '900000',
  10
);
const MAX_CONCURRENT_PER_TENANT = parseInt(
  process.env.AGENT_MAX_CONCURRENT_PER_TENANT ?? '3',
  10
);

interface ActiveExecution {
  child: ChildProcess;
  tenantId: string;
  timer: ReturnType<typeof setTimeout>;
  startedAt: number;
}

@Injectable()
export class AgentSandboxService implements OnModuleDestroy {
  private readonly logger = new Logger(AgentSandboxService.name);

  /** Map of executionId → active child process metadata */
  private readonly active = new Map<string, ActiveExecution>();

  /** Track per-tenant concurrency */
  private readonly tenantCounts = new Map<string, number>();

  get activeCount(): number {
    return this.active.size;
  }

  getTenantCount(tenantId: string): number {
    return this.tenantCounts.get(tenantId) ?? 0;
  }

  /**
   * Execute an agent workflow in a sandboxed child process.
   *
   * @param executionId Unique ID for tracking
   * @param config      Sandbox configuration (agent, input, limits)
   * @returns           Resolved with the worker's response
   */
  async execute(
    executionId: string,
    config: Omit<SandboxConfig, 'maxMemoryMb' | 'timeoutMs'> & {
      maxMemoryMb?: number;
      timeoutMs?: number;
    }
  ): Promise<SandboxResponse> {
    const maxMemoryMb = config.maxMemoryMb ?? DEFAULT_MAX_MEMORY_MB;
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const { tenantId } = config;

    // ── Tenant concurrency gate ─────────────────────────────────────────
    const currentCount = this.getTenantCount(tenantId);
    if (currentCount >= MAX_CONCURRENT_PER_TENANT) {
      this.logger.warn(
        `[AgentSandbox] Tenant ${tenantId} hit concurrency limit ` +
          `(${currentCount}/${MAX_CONCURRENT_PER_TENANT})`
      );
      return {
        success: false,
        error: `Tenant concurrency limit reached (max ${MAX_CONCURRENT_PER_TENANT})`,
        code: 'TENANT_LIMIT',
      };
    }

    return this.spawnWorker(executionId, {
      ...config,
      maxMemoryMb,
      timeoutMs,
    });
  }

  private spawnWorker(
    executionId: string,
    config: SandboxConfig
  ): Promise<SandboxResponse> {
    const { tenantId, maxMemoryMb, timeoutMs } = config;

    return new Promise<SandboxResponse>((resolve) => {
      const workerPath = join(__dirname, 'agent-worker.js');

      const child = fork(workerPath, [], {
        env: {
          ...process.env,
          NODE_OPTIONS: `--max-old-space-size=${maxMemoryMb}`,
        },
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        serialization: 'json',
      });

      this.incrementTenant(tenantId);

      // ── Timeout guard ───────────────────────────────────────────────
      const timer = setTimeout(() => {
        this.logger.error(
          `[AgentSandbox] Execution ${executionId} timed out after ${timeoutMs}ms`
        );
        this.killChild(executionId);
        resolve({
          success: false,
          error: `Execution timed out after ${timeoutMs}ms`,
          code: 'TIMEOUT',
        });
      }, timeoutMs);

      this.active.set(executionId, {
        child,
        tenantId,
        timer,
        startedAt: Date.now(),
      });

      let resolved = false;

      // ── IPC result handler ──────────────────────────────────────────
      child.on('message', (msg: WorkerMessage) => {
        if (msg.type === 'result' && !resolved) {
          resolved = true;
          this.cleanup(executionId);
          resolve(msg.response);
        }
        if (msg.type === 'cpu') {
          this.logger.debug(
            `[AgentSandbox] ${executionId} CPU: user=${msg.userMs}ms sys=${msg.systemMs}ms`
          );
        }
      });

      // ── Process exit (OOM or crash) ─────────────────────────────────
      child.on('exit', (code, signal) => {
        if (!resolved) {
          resolved = true;
          this.cleanup(executionId);
          const isOom = signal === 'SIGKILL' || code === 134;
          if (isOom) {
            this.logger.error(
              `[AgentSandbox] ${executionId} killed (OOM) — limit ${maxMemoryMb}MB`
            );
            resolve({
              success: false,
              error: `Agent exceeded memory limit (${maxMemoryMb}MB)`,
              code: 'OOM',
            });
          } else {
            this.logger.error(
              `[AgentSandbox] ${executionId} exited code=${code} signal=${signal}`
            );
            resolve({
              success: false,
              error: `Agent process exited unexpectedly (code=${code})`,
              code: 'CRASH',
            });
          }
        }
      });

      child.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          this.cleanup(executionId);
          this.logger.error(
            `[AgentSandbox] ${executionId} spawn error: ${err.message}`
          );
          resolve({
            success: false,
            error: `Failed to spawn agent process: ${err.message}`,
            code: 'UNKNOWN',
          });
        }
      });

      // ── Send start command to child ─────────────────────────────────
      const startMsg: WorkerStartMessage = { type: 'start', config };
      child.send(startMsg);

      this.logger.log(
        `[AgentSandbox] Spawned ${executionId} (tenant=${tenantId}, ` +
          `mem=${maxMemoryMb}MB, timeout=${timeoutMs}ms)`
      );
    });
  }

  /** Kill a child process by execution ID */
  private killChild(executionId: string): void {
    const entry = this.active.get(executionId);
    if (entry?.child && !entry.child.killed) {
      entry.child.kill('SIGKILL');
    }
  }

  /** Clean up tracking state for a completed/failed execution */
  private cleanup(executionId: string): void {
    const entry = this.active.get(executionId);
    if (!entry) return;

    clearTimeout(entry.timer);
    this.decrementTenant(entry.tenantId);
    if (!entry.child.killed) {
      entry.child.kill('SIGTERM');
    }
    this.active.delete(executionId);
  }

  private incrementTenant(tenantId: string): void {
    this.tenantCounts.set(tenantId, (this.tenantCounts.get(tenantId) ?? 0) + 1);
  }

  private decrementTenant(tenantId: string): void {
    const current = this.tenantCounts.get(tenantId) ?? 1;
    if (current <= 1) {
      this.tenantCounts.delete(tenantId);
    } else {
      this.tenantCounts.set(tenantId, current - 1);
    }
  }

  /** OnModuleDestroy: kill all active child processes */
  async onModuleDestroy(): Promise<void> {
    this.logger.log(
      `[AgentSandbox] Destroying — killing ${this.active.size} active workers`
    );
    for (const [id] of this.active) {
      this.killChild(id);
      this.cleanup(id);
    }
    this.active.clear();
    this.tenantCounts.clear();
  }
}
