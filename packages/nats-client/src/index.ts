export { NatsKVClient } from './kv.client.js';
export type { KVClientOptions } from './kv.client.js';
export { buildNatsOptions } from './connection.js';
export * from './events.js';
export * from './events-validator.js';
export {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerOpenError,
} from './circuit-breaker.js';
export type {
  CircuitBreakerOptions,
  CircuitBreakerLogger,
} from './circuit-breaker.js';
