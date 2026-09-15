import { SignJWT, jwtVerify } from 'jose';

/** The fallback secret. preflight.ts refuses to boot production with it. */
export const DEV_JWT_SECRET = 'dev-secret-change-in-production';

/** Read at call time so a test — or a reload — sees the current environment. */
function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? DEV_JWT_SECRET);
}

/** A session token. Long-lived: there is no refresh flow and no session table. */
export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

/** The user id a session token was issued for, or null if it does not verify. */
export async function verifySessionToken(
  token: string,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
