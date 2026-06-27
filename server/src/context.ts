import { type DB, apiTokens } from '@cubicecho/notes-db';
import { eq } from 'drizzle-orm';
import { hashApiToken, isApiToken } from './lib/api-token.ts';

export interface OrgMembership {
  orgId: string;
  role: 'owner' | 'member';
}

// How the caller authenticated. A 'session' actor is a logged-in user with
// their full account access; a 'token' actor is an API token restricted to a
// single org (it cannot touch the user account or create new orgs).
export type AuthKind = 'session' | 'token';

export interface Context {
  db: DB;
  userId?: string;
  authKind: AuthKind;
  getUserMemberships: () => Promise<OrgMembership[]>;
}

type OrgMemberRow = { orgId: string; role: 'owner' | 'member' };

const toMemberships = (rows: OrgMemberRow[]): OrgMembership[] =>
  rows.map((m) => ({ orgId: m.orgId, role: m.role }));

/**
 * Builds a per-request {@link Context} from the Authorization header, supporting
 * dual auth:
 *
 *  - **API token** (`cet_`-prefixed): looked up by hash. The actor is the
 *    token's creator but scoped to *only* the token's org — memberships in every
 *    other org are filtered out, so a token for org A can never reach org B.
 *  - **Session token** (raw user-id UUID, the MVP scheme) or the demo fallback:
 *    the actor is that user with all of their memberships.
 *
 * `getUserMemberships` is lazy and promise-cached so it runs at most once per
 * request regardless of how many permission rules consult it.
 */
export async function createContext(opts: {
  db: DB;
  authHeader?: string;
  demoUserId?: string;
}): Promise<Context> {
  const { db } = opts;
  const bearer = opts.authHeader?.replace('Bearer ', '');

  if (bearer && isApiToken(bearer)) {
    const token = await db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.tokenHash, hashApiToken(bearer)))
      .then((rows: (typeof apiTokens.$inferSelect)[]) => rows[0]);

    if (!token) {
      // Unknown or revoked token → unauthenticated.
      return {
        db,
        userId: undefined,
        authKind: 'token',
        getUserMemberships: async () => [],
      };
    }

    // Best-effort usage tracking; never block the request on it. `.execute()`
    // (with a swallowed rejection) actually runs the query — a bare
    // `void db.update(...)` would never execute, since drizzle query builders
    // are lazy until awaited.
    void db
      .update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, token.id))
      .execute()
      .catch(() => {});

    let membershipsPromise: Promise<OrgMembership[]> | undefined;
    return {
      db,
      userId: token.createdByUserId,
      authKind: 'token',
      getUserMemberships: () => {
        if (membershipsPromise === undefined) {
          membershipsPromise = db.query.orgMembers
            .findMany({ where: { userId: token.createdByUserId } })
            // Restrict the actor to exactly the token's org.
            .then((ms: OrgMemberRow[]) =>
              toMemberships(ms.filter((m) => m.orgId === token.orgId)),
            );
        }
        // biome-ignore lint/style/noNonNullAssertion: assigned in the branch above
        return membershipsPromise!;
      },
    };
  }

  // Session / demo path: the bearer value is the user id.
  const userId = bearer ?? opts.demoUserId;
  let membershipsPromise: Promise<OrgMembership[]> | undefined;
  return {
    db,
    userId,
    authKind: 'session',
    getUserMemberships: () => {
      if (membershipsPromise === undefined) {
        membershipsPromise = userId
          ? db.query.orgMembers
              .findMany({ where: { userId } })
              .then((ms: OrgMemberRow[]) => toMemberships(ms))
          : Promise.resolve([]);
      }
      // biome-ignore lint/style/noNonNullAssertion: assigned in the branch above
      return membershipsPromise!;
    },
  };
}
