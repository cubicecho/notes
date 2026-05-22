import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL ?? process.env.PGLITE_DATA_DIR;
if (!url) throw new Error('Set DATABASE_URL or PGLITE_DATA_DIR');

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
});
