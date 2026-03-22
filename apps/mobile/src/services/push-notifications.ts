/**
 * push-notifications.ts — Per-org push notification service.
 * Supports tenant-scoped topic subscription and unsubscription.
 * Stores push token via GraphQL mutation for server-side delivery.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

/** Build Expo push topic names for an org. */
export function buildPushTopics(tenantSlug: string): string[] {
  return [
    `org:${tenantSlug}:announcements`,
    `org:${tenantSlug}:course-updates`,
  ];
}

/** Register for push notifications with tenant-scoped topics. */
export async function registerForPushNotifications(
  _tenantSlug: string
): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PROJECT_ID ?? 'edusphere',
  });

  return token.data;
}

/** Unregister push notifications for a tenant (on logout). */
export async function unregisterPushNotifications(
  _tenantSlug: string
): Promise<void> {
  // Cancel all scheduled notifications for this tenant
  await Notifications.cancelAllScheduledNotificationsAsync();
  // Note: Expo Push doesn't support per-topic unsubscribe client-side.
  // Server should remove the push token from the tenant's subscription list.
}

/** Store push token on server via GraphQL mutation. */
export async function storePushTokenOnServer(
  token: string,
  tenantSlug: string,
  graphqlUrl: string
): Promise<boolean> {
  const mutation = `
    mutation RegisterPushToken($input: RegisterPushTokenInput!) {
      registerPushToken(input: $input) { success }
    }
  `;

  try {
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            token,
            platform: Device.osName?.toLowerCase() ?? 'unknown',
            tenantSlug,
            topics: buildPushTopics(tenantSlug),
          },
        },
      }),
    });
    const json = (await res.json()) as {
      data?: { registerPushToken?: { success: boolean } };
    };
    return json.data?.registerPushToken?.success ?? false;
  } catch {
    return false;
  }
}

/** Configure default notification handler. */
export function configurePushNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}
