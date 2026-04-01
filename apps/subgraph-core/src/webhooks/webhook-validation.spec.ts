/**
 * webhook-validation.spec.ts — Unit tests for webhook URL validation
 * and event validation helpers. Tests SSRF protection and event allowlist.
 */
import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import {
  validateWebhookUrl,
  validateWebhookEvents,
  VALID_EVENTS,
  MAX_WEBHOOKS_PER_ORG,
  MAX_RETRIES,
  AUTO_DISABLE_THRESHOLD,
  WEBHOOK_TIMEOUT_MS,
} from './webhook-validation.js';

describe('webhook-validation', () => {
  describe('constants', () => {
    it('exports expected constant values', () => {
      expect(MAX_WEBHOOKS_PER_ORG).toBe(10);
      expect(MAX_RETRIES).toBe(3);
      expect(AUTO_DISABLE_THRESHOLD).toBe(10);
      expect(WEBHOOK_TIMEOUT_MS).toBe(10_000);
    });

    it('VALID_EVENTS contains expected event types', () => {
      expect(VALID_EVENTS).toContain('course.completed');
      expect(VALID_EVENTS).toContain('course.enrolled');
      expect(VALID_EVENTS).toContain('badge.issued');
      expect(VALID_EVENTS).toContain('user.invited');
      expect(VALID_EVENTS).toContain('user.joined');
      expect(VALID_EVENTS).toContain('org.provisioned');
      expect(VALID_EVENTS).toContain('license.activated');
      expect(VALID_EVENTS).toHaveLength(7);
    });
  });

  describe('validateWebhookUrl', () => {
    it('accepts valid HTTPS URL', () => {
      expect(() =>
        validateWebhookUrl('https://api.example.com/webhook')
      ).not.toThrow();
    });

    it('accepts HTTPS URL with port', () => {
      expect(() =>
        validateWebhookUrl('https://hooks.example.com:8443/v1')
      ).not.toThrow();
    });

    it('accepts HTTPS URL with path and query', () => {
      expect(() =>
        validateWebhookUrl('https://example.com/hook?token=abc')
      ).not.toThrow();
    });

    it('rejects HTTP URL (non-HTTPS)', () => {
      expect(() => validateWebhookUrl('http://example.com/hook')).toThrow(
        BadRequestException
      );
    });

    it('rejects invalid URL format', () => {
      expect(() => validateWebhookUrl('not-a-url')).toThrow(
        BadRequestException
      );
    });

    it('rejects empty string', () => {
      expect(() => validateWebhookUrl('')).toThrow(BadRequestException);
    });

    // SSRF protection tests
    it('rejects 10.x.x.x private IP', () => {
      expect(() => validateWebhookUrl('https://10.0.0.1/hook')).toThrow(
        'private IPs'
      );
    });

    it('rejects 172.16-31.x.x private IP', () => {
      expect(() => validateWebhookUrl('https://172.16.0.1/hook')).toThrow(
        'private IPs'
      );
    });

    it('rejects 192.168.x.x private IP', () => {
      expect(() => validateWebhookUrl('https://192.168.1.1/hook')).toThrow(
        'private IPs'
      );
    });

    it('rejects 127.x.x.x loopback', () => {
      expect(() => validateWebhookUrl('https://127.0.0.1/hook')).toThrow(
        'private IPs'
      );
    });

    it('rejects 0.x.x.x', () => {
      expect(() => validateWebhookUrl('https://0.0.0.0/hook')).toThrow(
        'private IPs'
      );
    });

    it('rejects localhost (case insensitive)', () => {
      expect(() => validateWebhookUrl('https://localhost/hook')).toThrow(
        'private IPs'
      );
    });

    it('rejects Localhost (mixed case)', () => {
      expect(() => validateWebhookUrl('https://Localhost:3000/hook')).toThrow(
        'private IPs'
      );
    });

    it('rejects IPv6 loopback [::1]', () => {
      expect(() => validateWebhookUrl('https://[::1]/hook')).toThrow(
        'private IPs'
      );
    });

    it('allows public IPs like 8.8.8.8', () => {
      expect(() => validateWebhookUrl('https://8.8.8.8/hook')).not.toThrow();
    });

    it('allows 172.32.x.x (outside private range)', () => {
      expect(() => validateWebhookUrl('https://172.32.0.1/hook')).not.toThrow();
    });
  });

  describe('validateWebhookEvents', () => {
    it('accepts all valid events', () => {
      expect(() => validateWebhookEvents([...VALID_EVENTS])).not.toThrow();
    });

    it('accepts a single valid event', () => {
      expect(() => validateWebhookEvents(['course.completed'])).not.toThrow();
    });

    it('accepts empty array', () => {
      expect(() => validateWebhookEvents([])).not.toThrow();
    });

    it('rejects unknown event types', () => {
      expect(() => validateWebhookEvents(['course.deleted'])).toThrow(
        BadRequestException
      );
    });

    it('includes invalid event names in error message', () => {
      try {
        validateWebhookEvents(['course.completed', 'user.banned', 'foo.bar']);
        expect.fail('should have thrown');
      } catch (err) {
        expect((err as BadRequestException).message).toContain('user.banned');
        expect((err as BadRequestException).message).toContain('foo.bar');
      }
    });

    it('rejects when mix of valid and invalid events', () => {
      expect(() =>
        validateWebhookEvents(['badge.issued', 'invalid.event'])
      ).toThrow('invalid.event');
    });
  });
});
