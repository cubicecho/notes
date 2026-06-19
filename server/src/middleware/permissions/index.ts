/**
 * CASL-based permissions middleware — parallel implementation to permissions/.
 *
 * Abilities are defined per-request via defineAbilitiesFor() using MongoDB-style
 * conditions. Subject type detection uses __typename (already present on all
 * generated GraphQL types) so no ForcedSubject or subject() imports are needed.
 *
 *   ability.can('update', typed('User', { id: targetId }))
 *
 * Subject names and subject map are derived from the Resolvers type — no
 * manual type listings needed.
 */

import {
  type PermissionsMap,
  accept,
  createCan,
  deny,
} from '@vantreeseba/graphql-casl';
import type {
  MutationCreateNoteArgs,
  MutationCreateOrgMemberArgs,
  MutationDeleteOrgMembersArgs,
  MutationDeleteOrgsArgs,
  MutationUpdateNotesArgs,
  MutationUpdateOrgMembersArgs,
  MutationUpdateOrgsArgs,
  MutationUpdateUsersArgs,
  Resolvers,
} from '../../__generated__/resolvers.ts';
import type { Context } from '../../context.ts';
import {
  Actions,
  type AppSubjectMap,
  Subject,
  defineAbilitiesFor,
  typed,
} from './abilities.ts';

const { create, read, update, delete: del } = Actions;
const { User, Note, Org, OrgMember } = Subject;

// requireCan is bound to this app's context shape, subject map, and typed()
// subject constructor. Any project using the library creates its own instance
// via createCan with its own getAbility / isAuthenticated.
const canUser = createCan<Context, AppSubjectMap>(
  async (ctx) => {
    const memberships = await ctx.getUserMemberships();
    return defineAbilitiesFor(ctx.userId, memberships);
  },
  (ctx) => ctx.userId != null,
  typed,
);

export const permissions: PermissionsMap<Resolvers> = {
  Query: {
    // TODO: scope these to the caller's own data
    user: canUser(read, User),
    userSingle: canUser(read, User),
    note: canUser(read, Note),
    noteSingle: canUser(read, Note),
    org: canUser(read, Org),
    orgSingle: canUser(read, Org),
    orgMember: canUser(read, OrgMember),
    orgMemberSingle: canUser(read, OrgMember),
    myNotes: canUser(read, Note),
    myOrgs: canUser(read, Org),
    me: canUser(read, User),
  },
  Mutation: {
    // Auth — public, no token required
    requestMagicLink: accept,
    verifyMagicLink: accept,
    // Users
    createUsers: deny,
    createUser: deny,
    updateUsers: canUser(update, User, (args: MutationUpdateUsersArgs) => ({
      id: args.where?.id?.eq ?? undefined,
    })),
    deleteUsers: deny,

    // Notes
    createNotes: deny,
    createNote: canUser(create, Note, (args: MutationCreateNoteArgs) => ({
      orgId: args.values.orgId ?? null,
    })),
    updateNotes: canUser(update, Note, (args: MutationUpdateNotesArgs) => ({
      orgId: args.where?.orgId?.eq ?? undefined,
      userId: args.where?.userId?.eq ?? undefined,
    })),
    deleteNotes: deny,

    // Orgs
    createOrgs: deny,
    createOrg: canUser(create, Org),
    updateOrgs: canUser(update, Org, (args: MutationUpdateOrgsArgs) => ({
      id: args.where?.id?.eq ?? undefined,
    })),
    deleteOrgs: canUser(del, Org, (args: MutationDeleteOrgsArgs) => ({
      id: args.where?.id?.eq ?? undefined,
    })),

    // OrgMembers
    createOrgMembers: deny,
    createOrgMember: canUser(
      create,
      OrgMember,
      (args: MutationCreateOrgMemberArgs) => ({
        orgId: args.values.orgId,
      }),
    ),
    updateOrgMembers: canUser(
      update,
      OrgMember,
      (args: MutationUpdateOrgMembersArgs) => ({
        orgId: args.where?.orgId?.eq ?? undefined,
      }),
    ),
    deleteOrgMembers: canUser(
      del,
      OrgMember,
      (args: MutationDeleteOrgMembersArgs) => ({
        orgId: args.where?.orgId?.eq ?? undefined,
      }),
    ),
  },
};
