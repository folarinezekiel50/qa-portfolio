import { Platform } from 'react-native';

/**
 * The Android emulator reaches the host machine via 10.0.2.2; the iOS simulator can use localhost.
 * Override with EXPO_PUBLIC_API_URL (e.g. your laptop's LAN IP when testing on a real phone).
 */
const defaultUrl = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultUrl;
export const REQUEST_TIMEOUT_MS = 10_000;
