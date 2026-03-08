/**
 * usePushNotifications — manages Web Push subscription state.
 *
 * Checks current PushManager subscription status on mount,
 * exposes enable/disable actions backed by GraphQL mutations.
 *
 * Memory-safe: async checkStatus uses a cancelled flag to guard
 * against setState after unmount.
 */
import { useState, useEffect, useCallback } from 'react';
import { gql, useMutation } from 'urql';
import { subscribeWebPush, unsubscribeWebPush } from '@/lib/webPush';

const REGISTER_PUSH_TOKEN_MUTATION = gql`
  mutation RegisterPushToken($platform: PushPlatform!, $webPushSubscription: String) {
    registerPushToken(platform: $platform, webPushSubscription: $webPushSubscription) {
      id
      platform
      createdAt
    }
  }
`;

const UNREGISTER_PUSH_TOKEN_MUTATION = gql`
  mutation UnregisterPushToken($platform: PushPlatform!) {
    unregisterPushToken(platform: $platform)
  }
`;

export interface PushNotificationsState {
  isEnabled: boolean;
  isLoading: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

export function usePushNotifications(): PushNotificationsState {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [, registerToken] = useMutation(REGISTER_PUSH_TOKEN_MUTATION);
  const [, unregisterToken] = useMutation(UNREGISTER_PUSH_TOKEN_MUTATION);

  // Check current subscription status on mount (memory-safe: cancel guard)
  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      if (!('serviceWorker' in navigator)) return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!cancelled) setIsEnabled(!!sub);
    }

    void checkStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    setIsLoading(true);
    try {
      const subscriptionJson = await subscribeWebPush();
      if (subscriptionJson) {
        await registerToken({ platform: 'WEB', webPushSubscription: subscriptionJson });
        setIsEnabled(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [registerToken]);

  const disable = useCallback(async () => {
    setIsLoading(true);
    try {
      await unsubscribeWebPush();
      await unregisterToken({ platform: 'WEB' });
      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  }, [unregisterToken]);

  return { isEnabled, isLoading, enable, disable };
}
