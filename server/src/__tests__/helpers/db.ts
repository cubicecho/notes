import {
  createInMemoryDb,
  notes,
  orgMembers,
  orgs,
  users,
} from '@cubicecho/notes-db';
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

        return membershipsPromise;
      },
    };
  };

  return { db, schema, makeContext };
}

/** Deletes all rows from every table in FK-safe order. */
export async function cleanDb(
  db: Awaited<ReturnType<typeof createTestContext>>['db'],
) {
  await db.delete(orgMembers);
  await db.delete(notes);
  await db.delete(orgs);
  await db.delete(users);
}

/** Unwraps the first element of an array; throws if empty. */
export function first<T>(rows: ReadonlyArray<T>): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error('Expected at least one element');
  }
  return row;
}
