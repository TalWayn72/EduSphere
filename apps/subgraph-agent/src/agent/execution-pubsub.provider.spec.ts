/**
 * execution-pubsub.provider.spec.ts
 * Unit tests for the ExecutionPubSub provider and shared PubSub instance.
 */
import { describe, it, expect } from 'vitest';
import {
  executionPubSub,
  ExecutionPubSubProvider,
  EXECUTION_PUBSUB,
  type ExecutionPayload,
} from './execution-pubsub.provider.js';

describe('ExecutionPubSubProvider', () => {
  it('exports EXECUTION_PUBSUB token constant', () => {
    expect(EXECUTION_PUBSUB).toBe('EXECUTION_PUBSUB');
  });

  it('provides executionPubSub as useValue', () => {
    expect(ExecutionPubSubProvider.provide).toBe(EXECUTION_PUBSUB);
    expect(ExecutionPubSubProvider.useValue).toBe(executionPubSub);
  });

  it('executionPubSub has publish and subscribe methods', () => {
    expect(typeof executionPubSub.publish).toBe('function');
    expect(typeof executionPubSub.subscribe).toBe('function');
  });
});

describe('executionPubSub — pub/sub flow', () => {
  it('delivers published payload to subscriber', async () => {
    const topic = 'executionStatus_test-123' as const;
    const payload: { executionStatusChanged: ExecutionPayload } = {
      executionStatusChanged: {
        id: 'exec-1',
        status: 'COMPLETED',
        output: { summary: 'Done' },
      },
    };

    const received: Array<{ executionStatusChanged: ExecutionPayload }> = [];
    const iterator = executionPubSub.subscribe(topic);

    // Publish after a microtask to let subscriber register
    queueMicrotask(() => {
      executionPubSub.publish(topic, payload);
    });

    // Read one message from the async iterator
    const { value } = await iterator.next();
    received.push(value as { executionStatusChanged: ExecutionPayload });

    expect(received).toHaveLength(1);
    expect(received[0].executionStatusChanged.id).toBe('exec-1');
    expect(received[0].executionStatusChanged.status).toBe('COMPLETED');
    expect(received[0].executionStatusChanged.output).toEqual({
      summary: 'Done',
    });

    // Clean up: return the iterator
    await iterator.return!(undefined);
  });

  it('supports multiple subscribers on the same topic', async () => {
    const topic = 'executionStatus_multi' as const;
    const payload: { executionStatusChanged: ExecutionPayload } = {
      executionStatusChanged: {
        id: 'exec-2',
        status: 'RUNNING',
      },
    };

    const sub1 = executionPubSub.subscribe(topic);
    const sub2 = executionPubSub.subscribe(topic);

    queueMicrotask(() => {
      executionPubSub.publish(topic, payload);
    });

    const [r1, r2] = await Promise.all([sub1.next(), sub2.next()]);

    const v1 = r1.value as { executionStatusChanged: ExecutionPayload };
    const v2 = r2.value as { executionStatusChanged: ExecutionPayload };
    expect(v1.executionStatusChanged.id).toBe('exec-2');
    expect(v2.executionStatusChanged.id).toBe('exec-2');

    await sub1.return!(undefined);
    await sub2.return!(undefined);
  });

  it('handles payload with no output field', async () => {
    const topic = 'executionStatus_noout' as const;
    const payload: { executionStatusChanged: ExecutionPayload } = {
      executionStatusChanged: {
        id: 'exec-3',
        status: 'FAILED',
      },
    };

    const sub = executionPubSub.subscribe(topic);

    queueMicrotask(() => {
      executionPubSub.publish(topic, payload);
    });

    const { value } = await sub.next();
    const v = value as { executionStatusChanged: ExecutionPayload };
    expect(v.executionStatusChanged.output).toBeUndefined();
    expect(v.executionStatusChanged.status).toBe('FAILED');

    await sub.return!(undefined);
  });

  it('supports extra fields on ExecutionPayload', async () => {
    const topic = 'executionStatus_extra' as const;
    const payload: { executionStatusChanged: ExecutionPayload } = {
      executionStatusChanged: {
        id: 'exec-4',
        status: 'COMPLETED',
        customField: 'hello',
      },
    };

    const sub = executionPubSub.subscribe(topic);

    queueMicrotask(() => {
      executionPubSub.publish(topic, payload);
    });

    const { value } = await sub.next();
    const v = value as { executionStatusChanged: ExecutionPayload };
    expect(v.executionStatusChanged['customField']).toBe('hello');

    await sub.return!(undefined);
  });
});
