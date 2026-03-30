import { BadRequestException } from '@nestjs/common';

export const VALID_EVENTS = [
  'course.completed',
  'course.enrolled',
  'badge.issued',
  'user.invited',
  'user.joined',
  'org.provisioned',
  'license.activated',
];

export const MAX_WEBHOOKS_PER_ORG = 10;
export const MAX_RETRIES = 3;
export const AUTO_DISABLE_THRESHOLD = 10;
export const WEBHOOK_TIMEOUT_MS = 10_000;

// SSRF protection: block private IP ranges
const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /localhost/i,
  /\[::1\]/,
];

export function validateWebhookUrl(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      throw new BadRequestException('Webhook URL must use HTTPS');
    }
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(parsed.hostname)) {
        throw new BadRequestException('Webhook URL cannot target private IPs');
      }
    }
  } catch (err) {
    if (err instanceof BadRequestException) throw err;
    throw new BadRequestException('Invalid webhook URL');
  }
}

export function validateWebhookEvents(events: string[]): void {
  const invalid = events.filter((e) => !VALID_EVENTS.includes(e));
  if (invalid.length > 0) {
    throw new BadRequestException(
      `Invalid events: ${invalid.join(', ')}`
    );
  }
}
