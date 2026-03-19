/**
 * Memory safety tests for NotificationDispatcher and related services.
 * Validates that all @Injectable services with resources implement OnModuleDestroy
 * and properly clean up timers, connections, and subscriptions.
 */
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const NOTIFICATIONS_DIR = resolve(
  join(import.meta.dirname, '.')
);


/**
 * Services that manage resources (timers, connections, subscriptions)
 * MUST implement OnModuleDestroy.
 */
const SERVICES_WITH_RESOURCES = [
  {
    file: 'notification-dispatcher.service.ts',
    dir: NOTIFICATIONS_DIR,
    reason: 'dispatches to channels with potential pending promises',
  },
  {
    file: 'notification-retry.worker.ts',
    dir: NOTIFICATIONS_DIR,
    reason: 'uses setInterval for polling failed deliveries',
  },
];

describe('Memory safety — notification services', () => {
  for (const { file, dir, reason } of SERVICES_WITH_RESOURCES) {
    describe(file, () => {
      let content: string;
      try {
        content = readFileSync(join(dir, file), 'utf-8');
      } catch {
        // File may not exist yet if agent hasn't created it
        it.skip(`${file} not yet created`, () => {});
        return;
      }

      it(`must implement OnModuleDestroy (${reason})`, () => {
        expect(content).toContain('OnModuleDestroy');
        expect(content).toMatch(/implements\s+.*OnModuleDestroy/);
      });

      it('must import OnModuleDestroy from @nestjs/common', () => {
        expect(content).toContain("from '@nestjs/common'");
        expect(content).toContain('OnModuleDestroy');
      });

      it('must have onModuleDestroy method', () => {
        expect(content).toMatch(/async\s+onModuleDestroy|onModuleDestroy\s*\(/);
      });

      if (file.includes('retry')) {
        it('must clear setInterval in onModuleDestroy', () => {
          expect(content).toContain('setInterval');
          expect(content).toContain('clearInterval');
        });

        it('must store interval handle in class field', () => {
          // Should have a private field storing the interval
          expect(content).toMatch(
            /private\s+\w*[Ii]nterval|private\s+\w*[Tt]imer|private\s+\w*[Hh]andle/
          );
        });
      }
    });
  }

  it('NatsNotificationBridge must still implement OnModuleDestroy', () => {
    const content = readFileSync(
      join(NOTIFICATIONS_DIR, 'nats-notification.bridge.ts'),
      'utf-8'
    );
    expect(content).toContain('OnModuleDestroy');
    expect(content).toMatch(/implements\s+.*OnModuleDestroy/);
    expect(content).toContain('onModuleDestroy');
  });

  it('PushDispatchService must still implement OnModuleDestroy', () => {
    const content = readFileSync(
      join(NOTIFICATIONS_DIR, 'push-dispatch.service.ts'),
      'utf-8'
    );
    expect(content).toContain('OnModuleDestroy');
    expect(content).toMatch(/implements\s+.*OnModuleDestroy/);
  });
});
