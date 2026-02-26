/**
 * useWifiOnlySetting — persists the "download on WiFi only" preference.
 * Uses AsyncStorage for device-local persistence.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WIFI_ONLY_KEY = 'edusphere_wifi_only_download';

interface UseWifiOnlyReturn {
  wifiOnly: boolean;
  isLoading: boolean;
  toggle: () => Promise<void>;
}

export function useWifiOnlySetting(): UseWifiOnlyReturn {
  const [wifiOnly, setWifiOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(WIFI_ONLY_KEY)
      .then((v) => {
        setWifiOnly(v === 'true');
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const toggle = useCallback(async () => {
    const next = !wifiOnly;
    setWifiOnly(next);
    await AsyncStorage.setItem(WIFI_ONLY_KEY, String(next));
  }, [wifiOnly]);

  return { wifiOnly, isLoading, toggle };
}
