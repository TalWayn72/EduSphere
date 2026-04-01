/**
 * Notification Dispatch Events (Phase 65 — Social & Notification Integration)
 *
 * Covers: multi-channel notification dispatch, delivery status callbacks,
 * admin alerts via WhatsApp/email.
 */

// ─── Notification Dispatch Events ───────────────────────────────────────────

export type NotificationChannel =
  | 'push_web'
  | 'push_mobile'
  | 'email'
  | 'whatsapp'
  | 'in_app';

export type DeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced';

export interface NotificationDispatchPayload {
  readonly userId: string;
  readonly tenantId: string;
  readonly notificationType: string;
  readonly title: string;
  readonly body: string;
  readonly payload: Record<string, unknown>;
  readonly channels: NotificationChannel[];
  readonly timestamp: string;
}

export interface DeliveryStatusPayload {
  readonly deliveryId: string;
  readonly channel: NotificationChannel;
  readonly status: DeliveryStatus;
  readonly externalId: string;
  readonly errorMessage?: string;
  readonly timestamp: string;
}

// ─── Admin Alert Events ─────────────────────────────────────────────────────

export interface AdminAlertPayload {
  readonly tenantId: string;
  readonly alertType:
    | 'enrollment_spike'
    | 'system_health'
    | 'compliance_deadline';
  readonly severity: 'info' | 'warning' | 'critical';
  readonly title: string;
  readonly body: string;
  readonly metadata: Record<string, unknown>;
  readonly timestamp: string;
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isNotificationDispatchEvent(
  e: unknown
): e is NotificationDispatchPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['userId'] === 'string' &&
    typeof obj['tenantId'] === 'string' &&
    typeof obj['notificationType'] === 'string' &&
    Array.isArray(obj['channels'])
  );
}

export function isDeliveryStatusEvent(e: unknown): e is DeliveryStatusPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['deliveryId'] === 'string' &&
    typeof obj['channel'] === 'string' &&
    typeof obj['status'] === 'string'
  );
}

export function isAdminAlertEvent(e: unknown): e is AdminAlertPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['tenantId'] === 'string' &&
    typeof obj['alertType'] === 'string' &&
    typeof obj['severity'] === 'string'
  );
}
