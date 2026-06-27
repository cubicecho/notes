import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DB } from '@cubicecho/notes-db';
import { mergeResolvers } from '@graphql-tools/merge';
import { addResolversToSchema } from '@graphql-tools/schema';
import { buildSchema } from '@vantreeseba/drizzle-graphql';
import { extendSchema, parse } from 'graphql';
import type { GraphQLSchema } from 'graphql';
import { apiTokenResolvers } from './resolvers/api-tokens.ts';
import { authResolvers } from './resolvers/auth.ts';
import { noteResolvers } from './resolvers/notes.ts';
import { orgResolvers } from './resolvers/orgs.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionSDL = fs.readFileSync(
  path.resolve(__dirname, 'extensions.graphql'),
  'utf-8',
);

// The executable schema without permission middleware. This is the source of
// truth for the printed SDL (permissions only wrap resolver execution, not the
// SDL) and is used by generate_schema.ts. It deliberately avoids importing the
// permissions/abilities layer, which value-imports the generated CASL bindings
// from __generated__/resolvers.ts — pulling that in here would create a codegen
// bootstrap cycle (the bindings are generated from the schema this produces).
export function buildBaseSchema(db: DB): GraphQLSchema {
  const { schema: drizzleSchema } = buildSchema(db, {
    singularTypes: true,
    prefixes: {
      insert: 'create',
      update: 'update',
      delete: 'delete',
    },
  });

  const extended = extendSchema(drizzleSchema, parse(extensionSDL));

  return addResolversToSchema({
    schema: extended,
    resolvers: mergeResolvers([
      authResolvers,
      noteResolvers,
      orgResolvers,
      apiTokenResolvers,
    ]),
  });
}
