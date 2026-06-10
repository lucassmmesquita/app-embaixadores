/**
 * ═══════════════════════════════════════════════════════════════
 *  Platform Storage — Zustand persistence adapter
 *  Uses AsyncStorage on native, localStorage on web.
 *  No changes to native behavior.
 * ═══════════════════════════════════════════════════════════════
 */

import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

/**
 * Web-compatible storage that mirrors AsyncStorage's interface.
 * On native platforms, delegates to AsyncStorage.
 * On web, uses localStorage directly.
 */
const webStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Storage full or blocked — silent fail
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
    } catch {
      // silent fail
    }
  },
};

/**
 * Returns the appropriate storage adapter for the current platform.
 * - Native: AsyncStorage (async, React Native)
 * - Web: localStorage (sync, browser)
 */
export function getPlatformStorage(): StateStorage {
  if (Platform.OS === 'web') {
    return webStorage;
  }

  // Native — use AsyncStorage (lazy import to avoid web bundling issues)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return AsyncStorage;
}
