/**
 * Child process entry point for sandboxed agent execution.
 *
 * Launched via child_process.fork() from AgentSandboxService.
 * Receives agent config via IPC, executes the workflow, reports back.
 *
 * NODE_OPTIONS=--max-old-space-size=<MB> is set by the parent.
 */
import type {
  WorkerStartMessage,
  WorkerResultMessage,
  WorkerCpuMessage,
  SandboxConfig,
} from './sandbox.types.js';

const CPU_REPORT_INTERVAL_MS = 5_000;

let cpuTimer: ReturnType<typeof setInterval> | null = null;

function sendResult(msg: WorkerResultMessage): void {
  if (process.send) process.send(msg);
}

function sendCpu(): void {
  const usage = process.cpuUsage();
  const msg: WorkerCpuMessage = {
    type: 'cpu',
    userMs: usage.user / 1_000,
    systemMs: usage.system / 1_000,
  };
  if (process.send) process.send(msg);
}

function cleanup(): void {
  if (cpuTimer !== null) {
    clearInterval(cpuTimer);
    cpuTimer = null;
  }
}

async function executeAgent(config: SandboxConfig): Promise<void> {
  // Start periodic CPU reporting
  cpuTimer = setInterval(sendCpu, CPU_REPORT_INTERVAL_MS);

  try {
    // Dynamic import of AI service internals.
    // In the child process we import the legacy runner directly to
    // avoid bootstrapping the full NestJS DI container.
    const { AiLegacyRunnerService } = await import(
      '../ai/ai-legacy-runner.service.js'
    );
    const runner = new AiLegacyRunnerService();
    const model = runner.getModel();

    const agent = config.agent;
    const input = config.input;

    let result: Record<string, unknown>;
    if (agent.template === 'SUMMARIZE') {
      result = (await runner.runSummarizer(model, input)) as Record<
        string,
        unknown
      >;
    } else {
      result = (await runner.runGeneric(model, agent, input)) as Record<
        string,
        unknown
      >;
    }

    sendResult({ type: 'result', response: { success: true, data: result } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    sendResult({
      type: 'result',
      response: { success: false, error: message, code: 'CRASH' },
    });
  } finally {
    cleanup();
  }
}

// ── IPC message handler ─────────────────────────────────────────────────────

process.on('message', (msg: WorkerStartMessage) => {
  if (msg.type === 'start') {
    executeAgent(msg.config).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      sendResult({
        type: 'result',
        response: { success: false, error: message, code: 'UNKNOWN' },
      });
      cleanup();
    });
  }
});

// Graceful shutdown on disconnect
process.on('disconnect', () => {
  cleanup();
  process.exit(0);
});
