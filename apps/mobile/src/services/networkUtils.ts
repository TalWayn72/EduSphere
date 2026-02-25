/**
 * networkUtils — checks network type before allowing large downloads.
 * Uses @react-native-community/netinfo (already in package.json).
 */
import NetInfo from '@react-native-community/netinfo';

export async function isWifiConnected(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.type === 'wifi';
  } catch {
    return true; // fail open — allow download if check fails
  }
}

export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return true;
  }
}
