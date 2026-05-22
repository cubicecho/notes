/**
 * Auth middleware built with graphql-middleware.
 *
 * graphql-shield v7 is incompatible with Node ≥ 22 (uses removed util.isUndefined).
 * Until a compatible version is available, permission rules are implemented here
 * directly using graphql-middleware, which graphql-shield itself is built on.
 *
 * TODO: add isOrgMember — verify context.userId is a member of args.orgId.
 *       Apply to: addOrgMember, removeOrgMember, and createNote when orgId is set.
 */

import type { IMiddlewareFunction } from 'graphql-middleware';
import type { Context } from '../context.ts';

const requireAuth: IMiddlewareFunction<unknown, Context> = async (
  resolve,
  parent,
  args,
  context: Context,
  info,
) => {
  if (!context.userId) throw new Error('Not authenticated');
  return resolve(parent, args, context, info);
};

export const permissions = {
  Query: {
    myNotes: requireAuth,
    myOrgs: requireAuth,
  },
  Mutation: {
    createOrg: requireAuth,
    createNote: requireAuth,
    addOrgMember: requireAuth,
    removeOrgMember: requireAuth,
  },
};
