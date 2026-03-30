/**
 * Shared types for agent sandbox IPC communication.
 * Used by both the parent (AgentSandboxService) and child (agent-worker.ts).
 */

export interface SandboxConfig {
  /** Agent definition (template, config, etc.) */
  agent: { template: string; config?: unknown };
  /** Execution input (message, context, sessionId, etc.) */
  input: Record<string, unknown>;
  /** Tenant ID for concurrency tracking */
  tenantId: string;
  /** Max heap size in MB (default: 256) */
  maxMemoryMb: number;
  /** Execution timeout in ms (default: 900_000 = 15 min) */
  timeoutMs: number;
}

export interface SandboxResult {
  success: true;
  data: Record<string, unknown>;
}

export interface SandboxError {
  success: false;
  error: string;
  code: 'TIMEOUT' | 'OOM' | 'CRASH' | 'TENANT_LIMIT' | 'UNKNOWN';
}

export type SandboxResponse = SandboxResult | SandboxError;

/** IPC message from parent to child */
export interface WorkerStartMessage {
  type: 'start';
  config: SandboxConfig;
}

/** IPC message from child to parent */
export interface WorkerResultMessage {
  type: 'result';
  response: SandboxResponse;
}

/** IPC message from child: CPU usage report */
export interface WorkerCpuMessage {
  type: 'cpu';
  userMs: number;
  systemMs: number;
}

export type WorkerMessage = WorkerResultMessage | WorkerCpuMessage;
