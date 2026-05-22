import { Platform } from 'react-native';

function getLocalStorage() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage;
  }
  return null;
}

export const storage = {
  getItem(key: string): string | null {
    return getLocalStorage()?.getItem(key) ?? null;
  },
  setItem(key: string, value: string) {
    getLocalStorage()?.setItem(key, value);
  },
  removeItem(key: string) {
    getLocalStorage()?.removeItem(key);
  },
};
