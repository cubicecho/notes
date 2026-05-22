/**
 * CASL-based permissions middleware — parallel implementation to permissions/.
 *
 * Abilities are defined per-request via defineAbilitiesFor() using MongoDB-style
 * conditions. Subject type detection uses __typename (already present on all
 * generated GraphQL types) so no ForcedSubject or subject() imports are needed.
 *
 *   ability.can('update', typed('User', { id: targetId }))
 *
 * Subject names are derived from the Resolvers type — no manual string lists.
 */

import type { Resolvers } from '../../__generated__/resolvers.ts';
import type { Context } from '../../context.ts';
import {
  type PermissionsMap,
  type Rule,
  getArgValue,
} from '../permissions/utils.ts';
import {
  type Action,
  type AppSubjectName,
  defineAbilitiesFor,
  typed,
} from './abilities.ts';

// ---------------------------------------------------------------------------
// Per-request ability builder (memberships already cached in context)
// ---------------------------------------------------------------------------

async function buildAbility(context: Context) {
  const memberships = await context.getUserMemberships();
  return defineAbilitiesFor(context.userId, memberships);
}

// ---------------------------------------------------------------------------
// Rule helpers
// ---------------------------------------------------------------------------

function denied(): Rule {
  return () => {
    throw new Error('Forbidden');
  };
}

function requireCan(
  action: Action,
  subjectType: AppSubjectName | 'all',
  getSubjectData?: (args: Record<string, unknown>) => Record<string, unknown>,
): Rule {
  return async (resolve, parent, args, context, info) => {
    if (!context.userId) {
      throw new Error('Not authenticated');
    }
    const ability = await buildAbility(context);
    const instance =
      getSubjectData && subjectType !== 'all'
        ? typed(
            subjectType as Parameters<typeof typed>[0],
            getSubjectData(args as Record<string, unknown>),
          )
        : subjectType;

    if (!ability.can(action, instance)) {
      throw new Error('Forbidden');
    }
    return resolve(parent, args, context, info);
  };
}

// ---------------------------------------------------------------------------
// Permissions map
// ---------------------------------------------------------------------------

export const caslPermissions: PermissionsMap<Resolvers> = {
  Query: {
    // TODO: scope these to the caller's own data
    user: requireCan('read', 'User'),
    userSingle: requireCan('read', 'User'),
    note: requireCan('read', 'Note'),
    noteSingle: requireCan('read', 'Note'),
    org: requireCan('read', 'Org'),
    orgSingle: requireCan('read', 'Org'),
    orgMember: requireCan('read', 'OrgMember'),
    orgMemberSingle: requireCan('read', 'OrgMember'),
    myNotes: requireCan('read', 'Note'),
    myOrgs: requireCan('read', 'Org'),
  },
  Mutation: {
    // Users
    createUsers: denied(),
    createUser: denied(),
    updateUsers: requireCan('update', 'User', (args) => ({
      id: getArgValue(args, 'id'),
    })),
    deleteUsers: denied(),

    // Notes
    createNotes: denied(),
    createNote: requireCan('create', 'Note', (args) => ({
      orgId: getArgValue(args, 'orgId') ?? null,
    })),
    updateNotes: requireCan('update', 'Note', (args) => ({
      orgId: getArgValue(args, 'orgId'),
      userId: getArgValue(args, 'userId'),
    })),
    deleteNotes: denied(),

    // Orgs
    createOrgs: denied(),
    createOrg: requireCan('create', 'Org'),
    updateOrgs: requireCan('update', 'Org', (args) => ({
      id: getArgValue(args, 'id'),
    })),
    deleteOrgs: requireCan('delete', 'Org', (args) => ({
      id: getArgValue(args, 'id'),
    })),

    // OrgMembers
    createOrgMembers: denied(),
    createOrgMember: requireCan('create', 'OrgMember', (args) => ({
      orgId: getArgValue(args, 'orgId'),
    })),
    updateOrgMembers: requireCan('update', 'OrgMember', (args) => ({
      orgId: getArgValue(args, 'orgId'),
    })),
    deleteOrgMembers: requireCan('delete', 'OrgMember', (args) => ({
      orgId: getArgValue(args, 'orgId'),
    })),
  },
};
