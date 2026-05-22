import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'cubicecho_auth_token';

// In-memory cache so sync reads still work (Apollo header injection)
let _token: string | null = null;

export async function loadToken(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(TOKEN_KEY);
    _token = stored;
    return stored;
  } catch {
    return null;
  }
}

export async function persistToken(t: string | null): Promise<void> {
  _token = t;
  try {
    if (t) {
      await AsyncStorage.setItem(TOKEN_KEY, t);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors — token still held in memory
  }
}

/** Synchronous read for Apollo header injection. Call loadToken() on startup first. */
export function getToken(): string | null {
  return _token;
}

export function clearToken(): void {
  persistToken(null);
}
