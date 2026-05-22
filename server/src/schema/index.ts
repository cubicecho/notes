import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DB } from '@cubicecho/notes-db';
import { mergeResolvers } from '@graphql-tools/merge';
import { addResolversToSchema } from '@graphql-tools/schema';
import { buildSchema } from '@vantreeseba/drizzle-graphql';
import { extendSchema, parse } from 'graphql';
import type { GraphQLSchema } from 'graphql';
import { applyMiddleware } from 'graphql-middleware';
import { permissions } from '../middleware/permissions.ts';
import { noteResolvers } from './resolvers/notes.ts';
import { orgResolvers } from './resolvers/orgs.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionSDL = fs.readFileSync(
  path.resolve(__dirname, 'extensions.graphql'),
  'utf-8',
);

export function buildAppSchema(db: DB): GraphQLSchema {
  const { schema: drizzleSchema } = buildSchema(db, { singularTypes: true });

  const extended = extendSchema(drizzleSchema, parse(extensionSDL));

  const withResolvers = addResolversToSchema({
    schema: extended,
    resolvers: mergeResolvers([noteResolvers, orgResolvers]),
  });

  return applyMiddleware(withResolvers, permissions);
}
