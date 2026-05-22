/**
 * CASL-based permissions middleware — parallel implementation to permissions/.
 *
 * Instead of hand-coded rule functions, abilities are defined once per request
 * using CASL's MongoDB-query-style conditions (AbilityBuilder + createMongoAbility).
 * Each middleware entry extracts the relevant subject data from GraphQL args and
 * checks it against the ability with:
 *   ability.can(action, subject('SubjectType', { field: value }))
 *
 * The subject() helper tags a plain object so CASL knows which type to test
 * conditions against without requiring class instances.
 */

import { subject } from '@casl/ability';
import type { Resolvers } from '../../__generated__/resolvers.ts';
import type { Context } from '../../context.ts';
import {
  type PermissionsMap,
  type Rule,
  getArgValue,
} from '../permissions/utils.ts';
import { defineAbilitiesFor } from './abilities.ts';

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
  return (_resolve, _parent, _args, _context, _info) => {
    throw new Error('Forbidden');
  };
}

type AppAction = 'create' | 'read' | 'update' | 'delete' | 'manage';
type AppSubject = 'User' | 'Note' | 'Org' | 'OrgMember' | 'all';

function requireCan(
  action: AppAction,
  subjectType: AppSubject,
  getSubjectData?: (args: Record<string, unknown>) => Record<string, unknown>,
): Rule {
  return async (resolve, parent, args, context, info) => {
    const ability = await buildAbility(context);
    // biome-ignore lint/suspicious/noExplicitAny: subject() return type doesn't align with AppAbility Subjects union without casting
    const subjectInstance: any = getSubjectData
      ? subject(subjectType, getSubjectData(args as Record<string, unknown>))
      : subjectType;

    if (!ability.can(action, subjectInstance)) {
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
