import type { Context } from '../../context.ts';
import { type Rule, getArgValue } from './utils.ts';

export const requireAuth: Rule = async (
  resolve,
  _parent,
  _args,
  context: Context,
  info,
) => {
  if (!context.userId) {
    throw new Error('Not authenticated');
  }
  return resolve(_parent, _args, context, info);
};

// Checks that context.userId matches the id being acted on (where.id.eq or values.id).
export const isOwner: Rule = async (resolve, parent, args, context, info) => {
  const id = getArgValue(args as Record<string, unknown>, 'id');
  if (id !== context.userId) {
    throw new Error('Forbidden');
  }
  return resolve(parent, args, context, info);
};

// Checks that context.userId is a member (any role) of the orgId in args.
// No-op when orgId is absent (allows optional-orgId mutations like createNote).
export const isOrgMember: Rule = async (
  resolve,
  parent,
  args,
  context,
  info,
) => {
  const orgId = getArgValue(args as Record<string, unknown>, 'orgId');
  if (orgId) {
    const memberships = await context.getUserMemberships();
    if (!memberships.some((m) => m.orgId === orgId)) {
      throw new Error('Forbidden');
    }
  }
  return resolve(parent, args, context, info);
};

// Checks that context.userId is an owner-role member of the org identified by
// args.where.id.eq — used for updateOrgs/deleteOrgs where the filter key is `id`.
export const isOrgOwnerById: Rule = async (
  resolve,
  parent,
  args,
  context,
  info,
) => {
  const orgId = getArgValue(args as Record<string, unknown>, 'id');
  if (!orgId) {
    throw new Error('Forbidden');
  }
  const memberships = await context.getUserMemberships();
  if (!memberships.some((m) => m.orgId === orgId && m.role === 'owner')) {
    throw new Error('Forbidden');
  }
  return resolve(parent, args, context, info);
};

// Checks that context.userId is an owner-role member of the orgId in args.
export const isOrgOwner: Rule = async (
  resolve,
  parent,
  args,
  context,
  info,
) => {
  const orgId = getArgValue(args as Record<string, unknown>, 'orgId');
  if (!orgId) {
    throw new Error('Forbidden');
  }
  const memberships = await context.getUserMemberships();
  if (!memberships.some((m) => m.orgId === orgId && m.role === 'owner')) {
    throw new Error('Forbidden');
  }
  return resolve(parent, args, context, info);
};
