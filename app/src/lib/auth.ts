export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

let token: string | null = DEMO_USER_ID;

export function getToken(): string | null {
  return token;
}

export function setToken(t: string | null) {
  token = t;
}

export function clearToken() {
  token = null;
}
