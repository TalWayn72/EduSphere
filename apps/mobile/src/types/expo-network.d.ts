/**
 * Ambient type declaration for expo-network.
 * expo-network is used by SyncEngine for connectivity detection.
 * This declaration provides TypeScript types without requiring the package
 * to be installed in the development environment.
 */
declare module 'expo-network' {
  export enum NetworkStateType {
    NONE = 0,
    UNKNOWN = 1,
    CELLULAR = 2,
    WIFI = 3,
    BLUETOOTH = 4,
    ETHERNET = 5,
    WIMAX = 6,
    VPN = 7,
    OTHER = 8,
  }

  export interface NetworkState {
    type: NetworkStateType;
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
  }

  export function getNetworkStateAsync(): Promise<NetworkState>;
  export function getIpAddressAsync(): Promise<string>;
  export function isAirplaneModeEnabledAsync(): Promise<boolean>;
}
