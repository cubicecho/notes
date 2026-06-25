import type { DB } from '@cubicecho/notes-db';
import { applyPermissions } from '@vantreeseba/graphql-casl';
import type { GraphQLSchema } from 'graphql';
import type { Resolvers } from '../__generated__/resolvers.ts';
import { permissions } from '../middleware/permissions/index.ts';
import { buildBaseSchema } from './base.ts';

export { buildBaseSchema };

export function buildAppSchema(db: DB): GraphQLSchema {
  return applyPermissions<Resolvers>(buildBaseSchema(db), permissions);
}
