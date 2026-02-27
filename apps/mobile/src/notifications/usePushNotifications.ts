/**
 * usePushNotifications — registers for Expo push tokens, handles incoming
 * notifications (foreground + background tap), and stores the token.
 * Memory-safe: all subscriptions are removed in the useEffect cleanup.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PUSH_TOKEN_KEY = '@edusphere/push_token';

// Foreground notification behaviour: show banner + play sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface PushNotificationHandlers {
  /** Called when a notification arrives while the app is in the foreground. */
  onForegroundNotification?: (notification: Notifications.Notification) => void;
  /** Called when the user taps a notification (foreground or background). */
  onNotificationResponse?: (
    response: Notifications.NotificationResponse
  ) => void;
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push tokens are not available on simulators/emulators
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

async function persistToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch {
    // Non-fatal: token registration failure should not crash the app
  }
}

export function usePushNotifications(
  handlers: PushNotificationHandlers = {}
): void {
  const foregroundSubRef = useRef<Notifications.Subscription | null>(null);
  const responseSubRef = useRef<Notifications.Subscription | null>(null);

  const stableForeground = useRef(handlers.onForegroundNotification);
  const stableResponse = useRef(handlers.onNotificationResponse);

  // Keep refs up to date without triggering re-registration
  stableForeground.current = handlers.onForegroundNotification;
  stableResponse.current = handlers.onNotificationResponse;

  const handleForeground = useCallback(
    (notification: Notifications.Notification) => {
      stableForeground.current?.(notification);
    },
    []
  );

  const handleResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      stableResponse.current?.(response);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    // 1. Register and persist push token
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token && !cancelled) {
          void persistToken(token);
        }
      })
      .catch(() => {
        // Non-fatal — device may not support push
      });

    // 2. Subscribe to foreground notifications
    foregroundSubRef.current =
      Notifications.addNotificationReceivedListener(handleForeground);

    // 3. Subscribe to notification taps
    responseSubRef.current =
      Notifications.addNotificationResponseReceivedListener(handleResponse);

    return () => {
      cancelled = true;
      foregroundSubRef.current?.remove();
      responseSubRef.current?.remove();
      foregroundSubRef.current = null;
      responseSubRef.current = null;
    };
  }, [handleForeground, handleResponse]);
}
