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

import type {
  MutationCreateNoteArgs,
  MutationCreateOrgArgs,
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
import { Actions, Subject, defineAbilitiesFor, typed } from './abilities.ts';
import { type PermissionsMap, deny } from './utils.ts';
import { createRequireCan } from './utils.ts';

const { create, read, update, delete: del } = Actions;
const { User, Note, Org, OrgMember } = Subject;

// requireCan is bound to this app's context shape, ability builder, and
// typed() subject constructor. Any project using the library creates its
// own instance via createRequireCan with its own getAbility / isAuthenticated.
const requireCan = createRequireCan<
  Context,
  ReturnType<typeof defineAbilitiesFor>
>(
  async (ctx) => {
    const memberships = await ctx.getUserMemberships();
    return defineAbilitiesFor(ctx.userId, memberships);
  },
  (ctx) => ctx.userId != null,
  // biome-ignore lint/suspicious/noExplicitAny: typed<K> generic can't widen to (string) at the call site
  typed as (type: string, attrs: Record<string, unknown>) => any,
);

export const permissions: PermissionsMap<Resolvers> = {
  Query: {
    // TODO: scope these to the caller's own data
    user: requireCan(read, User),
    userSingle: requireCan(read, User),
    note: requireCan(read, Note),
    noteSingle: requireCan(read, Note),
    org: requireCan(read, Org),
    orgSingle: requireCan(read, Org),
    orgMember: requireCan(read, OrgMember),
    orgMemberSingle: requireCan(read, OrgMember),
    myNotes: requireCan(read, Note),
    myOrgs: requireCan(read, Org),
  },
  Mutation: {
    // Users
    createUsers: deny,
    createUser: deny,
    updateUsers: requireCan<MutationUpdateUsersArgs>(update, User, (args) => ({
      id: args.where?.id?.eq,
    })),
    deleteUsers: deny,

    // Notes
    createNotes: deny,
    createNote: requireCan<MutationCreateNoteArgs>(create, Note, (args) => ({
      orgId: args.values.orgId ?? null,
    })),
    updateNotes: requireCan<MutationUpdateNotesArgs>(update, Note, (args) => ({
      orgId: args.where?.orgId?.eq,
      userId: args.where?.userId?.eq,
    })),
    deleteNotes: deny,

    // Orgs
    createOrgs: deny,
    createOrg: requireCan<MutationCreateOrgArgs>(create, Org),
    updateOrgs: requireCan<MutationUpdateOrgsArgs>(update, Org, (args) => ({
      id: args.where?.id?.eq,
    })),
    deleteOrgs: requireCan<MutationDeleteOrgsArgs>(del, Org, (args) => ({
      id: args.where?.id?.eq,
    })),

    // OrgMembers
    createOrgMembers: deny,
    createOrgMember: requireCan<MutationCreateOrgMemberArgs>(
      create,
      OrgMember,
      (args) => ({
        orgId: args.values.orgId,
      }),
    ),
    updateOrgMembers: requireCan<MutationUpdateOrgMembersArgs>(
      update,
      OrgMember,
      (args) => ({
        orgId: args.where?.orgId?.eq,
      }),
    ),
    deleteOrgMembers: requireCan<MutationDeleteOrgMembersArgs>(
      del,
      OrgMember,
      (args) => ({
        orgId: args.where?.orgId?.eq,
      }),
    ),
  },
};
