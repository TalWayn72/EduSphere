import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationToken {
  token: string;
  type: 'expo' | 'apns' | 'fcm';
}

export class NotificationService {
  private token: string | null = null;
  private notificationListener: any;
  private responseListener: any;

  async initialize(): Promise<PushNotificationToken | null> {
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    // Request permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permissions not granted');
      return null;
    }

    // Get push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    this.token = (
      await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
      });
    }

    return {
      token: this.token,
      type: 'expo',
    };
  }

  setupListeners(
    onNotification: (notification: Notifications.Notification) => void,
    onResponse: (response: Notifications.NotificationResponse) => void
  ) {
    this.notificationListener =
      Notifications.addNotificationReceivedListener(onNotification);
    this.responseListener =
      Notifications.addNotificationResponseReceivedListener(onResponse);
  }

  removeListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  async scheduleLocal(
    title: string,
    body: string,
    data?: any,
    trigger?: number
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: trigger
        ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: trigger, repeats: false }
        : null,
    });
  }

  async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  getToken(): string | null {
    return this.token;
  }
}

export const notificationService = new NotificationService();
