/**
 * Permission rules and combinators built on graphql-middleware.
 *
 * graphql-shield v7 is incompatible with Node ≥ 22 (uses removed util.isUndefined).
 * Rules are implemented here directly with graphql-middleware instead.
 *
 * Usage:
 *   myNotes: and(requireAuth, or(isOwner, isOrgMember))
 */

import type { Resolvers } from '../../__generated__/resolvers.ts';
import type { Context } from '../../context.ts';
import {
  type PermissionsMap,
  type Rule,
  and,
  getArgValue,
  or,
} from './utils.ts';

export const requireAuth: Rule = async (_parent, _args, context: Context) => {
  if (!context.userId) {
    throw new Error('Not authenticated');
  }
};

// TODO: check that context.userId owns the resource being accessed
export const isOwner: Rule = async () => {};

// Checks that context.userId is a member (any role) of the orgId in args.
// No-op when orgId is absent (allows optional-orgId mutations like createNote).
export const isOrgMember: Rule = async (_parent, args, context) => {
  const orgId = getArgValue(args, 'orgId');
  if (!orgId) {
    return;
  }
  const memberships = await context.getUserMemberships();
  if (!memberships.some((m) => m.orgId === orgId)) {
    throw new Error('Forbidden');
  }
};

// Checks that context.userId is an owner-role member of the orgId in args.
export const isOrgOwner: Rule = async (_parent, args, context) => {
  const orgId = getArgValue(args, 'orgId');
  if (!orgId) {
    throw new Error('Forbidden');
  }
  const memberships = await context.getUserMemberships();
  if (!memberships.some((m) => m.orgId === orgId && m.role === 'owner')) {
    throw new Error('Forbidden');
  }
};

export const permissions: PermissionsMap<Resolvers> = {
  Query: {
    myNotes: and(requireAuth, or(isOwner, isOrgMember)),
    myOrgs: and(requireAuth),
  },
  Mutation: {
    createOrg: and(requireAuth),
    createNote: and(requireAuth, isOrgMember),
    createOrgMember: and(requireAuth, isOrgOwner),
    deleteOrgMembers: and(requireAuth, isOrgOwner),
  },
};
