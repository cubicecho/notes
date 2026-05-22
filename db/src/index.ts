import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { relations } from './relations.ts';
import * as schema from './schema.ts';

const databaseUrl = process.env.DATABASE_URL;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsFolder = path.resolve(__dirname, '../drizzle');

// biome-ignore lint/suspicious/noExplicitAny: dual-backend Drizzle instance
let db: any;

if (databaseUrl) {
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const postgres = await import('postgres');
  const client = postgres.default(databaseUrl);
  // @ts-expect-error drizzle-orm 1.0-beta removed `schema` from config types
  db = drizzle({ client, schema, relations });

  const { migrate } = await import('drizzle-orm/postgres-js/migrator');
  await migrate(db, { migrationsFolder });
} else {
  const dir = process.env.PGLITE_DATA_DIR;

  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');

  // in-memory when no dir specified (tests, schema generation)
  const client = dir ? new PGlite(dir) : new PGlite();
  await client.waitReady;
  // @ts-expect-error drizzle-orm 1.0-beta removed `schema` from config types
  db = drizzle({ client, schema, relations });

  await migrate(db, { migrationsFolder });
}

export { db };
export type DB = typeof db;

export { schema };
export * from './schema.ts';

export async function createInMemoryDb() {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');

  const client = new PGlite();
  await client.waitReady;
  // @ts-expect-error drizzle-orm 1.0-beta removed `schema` from config types
  const testDb = drizzle({ client, schema, relations });
  await migrate(testDb, { migrationsFolder });
  return testDb;
}
