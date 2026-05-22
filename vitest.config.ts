import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    // Force all graphql imports to the same instance
    alias: {
      graphql: resolve(__dirname, 'node_modules/graphql/index.js'),
    },
    conditions: ['import', 'module', 'default'],
  },
  optimizeDeps: {
    exclude: ['graphql', '@vantreeseba/drizzle-graphql', 'graphql-middleware'],
  },
  test: {
    include: ['server/src/**/*.test.ts'],
    environment: 'node',
    globals: false,
    pool: 'forks',
  },
});
