import crypto from 'node:crypto';

// All API tokens carry this prefix so the auth layer can distinguish them from
// magic-link session tokens (raw user-id UUIDs) on the Authorization header.
export const API_TOKEN_PREFIX = 'cet_';

// Number of random bytes behind a token. 32 bytes = 256 bits of entropy, which
// is why a plain SHA-256 (fast, unsalted) is sufficient for storage: the token
// is not a low-entropy password, so brute-forcing the hash is infeasible.
const TOKEN_BYTES = 32;

export interface GeneratedApiToken {
  /** Full plaintext token — returned to the user exactly once, never stored. */
  token: string;
  /** SHA-256 hex digest stored in the DB and matched on each request. */
  tokenHash: string;
  /** Non-secret leading slice for display (e.g. `cet_a1b2c3d4`). */
  tokenPrefix: string;
}

export function hashApiToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateApiToken(): GeneratedApiToken {
  const secret = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const token = `${API_TOKEN_PREFIX}${secret}`;
  return {
    token,
    tokenHash: hashApiToken(token),
    tokenPrefix: `${API_TOKEN_PREFIX}${secret.slice(0, 8)}`,
  };
}

export function isApiToken(value: string): boolean {
  return value.startsWith(API_TOKEN_PREFIX);
}
