/**
 * Graceful shutdown handler for Hive Gateway v2.
 *
 * During Kubernetes rolling updates (SIGTERM), this module:
 * 1. Stops accepting new HTTP/WebSocket connections
 * 2. Waits for active WebSocket subscriptions to complete (up to 30s)
 * 3. Drains the NATS pub/sub connection
 * 4. Cleans up rate-limit timers
 * 5. Exits with code 0
 *
 * The drain timeout is configurable via SHUTDOWN_DRAIN_TIMEOUT_MS (default 30000).
 */

import type { Server } from 'http';
import type { WebSocketServer } from 'ws';
import type { Logger } from 'pino';

export interface ShutdownDeps {
  server: Server;
  wsServer?: WebSocketServer;
  stopRateLimitCleanup: () => void;
  shutdownNatsPubSub: () => Promise<void>;
  logger: Logger;
}

/** Maximum time (ms) to wait for WebSocket connections to drain. */
export const DRAIN_TIMEOUT_MS = parseInt(
  process.env['SHUTDOWN_DRAIN_TIMEOUT_MS'] ?? '30000',
  10
);

/**
 * Count active WebSocket connections on the HTTP server.
 * Node.js `server.connections` is deprecated; we inspect the internal
 * socket list exposed by `server.getConnections()` callback.
 */
function getActiveConnections(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.getConnections((err, count) => {
      if (err) reject(err);
      else resolve(count);
    });
  });
}

/**
 * Wait until all connections close or the timeout expires.
 * Returns true if all connections drained, false if timed out.
 */
export async function waitForConnectionDrain(
  server: Server,
  timeoutMs: number,
  logger: Logger
): Promise<boolean> {
  const start = Date.now();
  const pollInterval = 500;

  while (Date.now() - start < timeoutMs) {
    const count = await getActiveConnections(server);
    if (count === 0) {
      logger.info('[shutdown] all connections drained');
      return true;
    }
    logger.info(
      { activeConnections: count, elapsedMs: Date.now() - start },
      '[shutdown] waiting for connections to drain'
    );
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  const remaining = await getActiveConnections(server);
  logger.warn(
    { remaining, timeoutMs },
    '[shutdown] drain timeout expired — forcing close'
  );
  return false;
}

/**
 * Perform a graceful shutdown sequence. Exported for unit testing.
 */
export async function performShutdown(
  signal: string,
  deps: ShutdownDeps
): Promise<void> {
  const { server, wsServer, stopRateLimitCleanup, shutdownNatsPubSub, logger } = deps;

  logger.info({ signal }, '[shutdown] received signal — starting graceful shutdown');

  // 1. Stop accepting new connections
  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) {
        logger.error({ err }, '[shutdown] error closing HTTP server');
        reject(err);
      } else {
        logger.info('[shutdown] HTTP server stopped accepting new connections');
        resolve();
      }
    });
  });

  // 2. Close WebSocket server (stops accepting new WS connections)
  if (wsServer) {
    await new Promise<void>((resolve) => {
      wsServer.close(() => {
        logger.info('[shutdown] WebSocket server closed');
        resolve();
      });
    });
  }

  // 3. Wait for active connections to drain
  await waitForConnectionDrain(server, DRAIN_TIMEOUT_MS, logger);

  // 4. Stop rate-limit cleanup timer
  stopRateLimitCleanup();
  logger.info('[shutdown] rate-limit cleanup stopped');

  // 5. Drain NATS pub/sub connection
  await shutdownNatsPubSub();
  logger.info('[shutdown] NATS pub/sub drained');

  logger.info('[shutdown] graceful shutdown complete');
}

/**
 * Register SIGTERM and SIGINT handlers. Call once at gateway startup.
 */
export function registerShutdownHandlers(deps: ShutdownDeps): void {
  const handler = (signal: string) => {
    void performShutdown(signal, deps).then(() => {
      process.exit(0);
    }).catch((err) => {
      deps.logger.error({ err }, '[shutdown] error during shutdown');
      process.exit(1);
    });
  };

  process.on('SIGTERM', () => handler('SIGTERM'));
  process.on('SIGINT', () => handler('SIGINT'));

  deps.logger.info('[shutdown] graceful shutdown handlers registered');
}
