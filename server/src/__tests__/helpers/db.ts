import { createInMemoryDb, type orgMembers } from '@cubicecho/notes-db';
import type { Context } from '../../context.ts';
import { buildAppSchema } from '../../schema/index.ts';

export async function createTestContext() {
  const db = await createInMemoryDb();
  const schema = buildAppSchema(db);

  const makeContext = (userId?: string): Context => {
    let membershipsPromise:
      | Promise<{ orgId: string; role: 'owner' | 'member' }[]>
      | undefined;

    return {
      db,
      userId,
      getUserMemberships: () => {
        if (membershipsPromise === undefined) {
          membershipsPromise = db.query.orgMembers
            .findMany({ where: { userId } })
            .then((ms: (typeof orgMembers.$inferSelect)[]) =>
              ms.map((m) => ({ orgId: m.orgId, role: m.role })),
            );
        }
        // biome-ignore lint/style/noNonNullAssertion: assigned in the branch above
        return membershipsPromise!;
      },
    };
  };

  return { db, schema, makeContext };
}

/** Unwraps the first element of an array; throws if empty. */
export function first<T>(rows: ReadonlyArray<T>): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error('Expected at least one element');
  }
  return row;
}
