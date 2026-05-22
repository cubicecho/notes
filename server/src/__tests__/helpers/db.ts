import { createInMemoryDb } from '@cubicecho/notes-db';
import { buildAppSchema } from '../../schema/index.ts';

export async function createTestContext(userId?: string) {
  const db = await createInMemoryDb();
  const schema = buildAppSchema(db);
  return { db, schema, userId };
}

/** Unwraps the first element of an array; throws if empty. */
export function first<T>(rows: ReadonlyArray<T>): T {
  const row = rows[0];
  if (row === undefined) throw new Error('Expected at least one element');
  return row;
}
