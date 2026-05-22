/**
 * Permission rules and combinators built on graphql-middleware.
 *
 * graphql-shield v7 is incompatible with Node ≥ 22 (uses removed util.isUndefined).
 * Rules are implemented here directly with graphql-middleware instead.
 *
 * Usage:
 *   myNotes: and(requireAuth, or(isOwner, isOrgMember))
 *   myOrgs:  requireAuth   ← rules can also be used naked
 */

import type { Resolvers } from '../../__generated__/resolvers.ts';
import {
  isOrgMember,
  isOrgOwner,
  isOrgOwnerById,
  isOwner,
  requireAuth,
} from './rules.ts';
import { type PermissionsMap, and, deny } from './utils.ts';

export {
  requireAuth,
  isOwner,
  isOrgMember,
  isOrgOwner,
  isOrgOwnerById,
} from './rules.ts';

export const permissions: PermissionsMap<Resolvers> = {
  Query: {
    // TODO: scope these to the caller's own data once isOwner is implemented
    user: requireAuth,
    userSingle: requireAuth,
    note: requireAuth,
    noteSingle: requireAuth,
    org: requireAuth,
    orgSingle: requireAuth,
    orgMember: requireAuth,
    orgMemberSingle: requireAuth,
    // Custom
    myNotes: requireAuth,
    myOrgs: requireAuth,
  },
  Mutation: {
    // Users — created internally only (e.g. during auth flow)
    createUsers: deny,
    createUser: deny,
    updateUsers: and(requireAuth, isOwner),
    deleteUsers: deny,

    // Notes
    // createNotes: array input — cannot check per-element orgId, auth only
    createNotes: requireAuth,
    // createNote: values.orgId optional → isOrgMember is a no-op when absent
    createNote: and(requireAuth, isOrgMember),
    // updateNotes/deleteNotes: where.orgId.eq available → isOrgMember enforces org access
    // TODO: also add isOwner for personal notes once implemented
    updateNotes: and(requireAuth, isOrgMember),
    deleteNotes: and(requireAuth, isOrgMember),

    // Orgs — createOrg is overridden by a custom resolver that adds the caller as owner
    // createOrgs: array input — auth only; no auto-owner added for bulk
    createOrgs: requireAuth,
    createOrg: requireAuth,
    // updateOrgs/deleteOrgs: where.id.eq is the org's own id → isOrgOwnerById
    updateOrgs: and(requireAuth, isOrgOwnerById),
    deleteOrgs: and(requireAuth, isOrgOwnerById),

    // OrgMembers
    // createOrgMembers: array input — cannot check per-element orgId; deny until safe
    createOrgMembers: deny,
    createOrgMember: and(requireAuth, isOrgOwner),
    updateOrgMembers: and(requireAuth, isOrgOwner),
    deleteOrgMembers: and(requireAuth, isOrgOwner),
  },
};
