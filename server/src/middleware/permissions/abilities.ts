import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type {
  Resolvers,
  ResolversTypes,
} from '../../__generated__/resolvers.ts';
import type { OrgMembership } from '../../context.ts';
import {
  Actions,
  type AppAbility,
  type SubjectMap,
  type SubjectName,
  abilityOptions,
  createSubjects,
  createTyped,
} from './utils.ts';

// ---------------------------------------------------------------------------
// App-specific bindings — fully derived from the generated schema types.
// No manual model-type imports needed.
// ---------------------------------------------------------------------------

export type AppSubjectMap = SubjectMap<Resolvers, ResolversTypes>;
export type AppSubjectName = SubjectName<Resolvers>;

// typed() helper bound to this app's subject map.
export const typed = createTyped<AppSubjectMap>();

// Subject const — use instead of raw strings in can/cannot calls.
// `satisfies`-style validation via createSubjects ensures this object covers
// every AppSubjectName; TypeScript errors if the schema adds a new domain type
// and this object isn't updated.
export const Subject = createSubjects<AppSubjectMap>()({
  User: 'User',
  Note: 'Note',
  Org: 'Org',
  OrgMember: 'OrgMember',
} as const);

export { Actions };
export type { AppAbility };

// ---------------------------------------------------------------------------
// defineAbilitiesFor
// ---------------------------------------------------------------------------

export function defineAbilitiesFor(
  userId: string | undefined,
  memberships: OrgMembership[],
): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(
    createMongoAbility,
  );

  if (!userId) {
    cannot(Actions.manage, 'all');
    return build(abilityOptions);
  }

  const memberOrgIds = memberships.map((m) => m.orgId);
  const ownerOrgIds = memberships
    .filter((m) => m.role === 'owner')
    .map((m) => m.orgId);

  // ── Users ──────────────────────────────────────────────────────────────
  cannot(Actions.create, Subject.User);
  cannot(Actions.delete, Subject.User);
  can(Actions.read, Subject.User);
  can(Actions.update, Subject.User, { id: userId });

  // ── Notes ──────────────────────────────────────────────────────────────
  can(Actions.read, Subject.Note);
  can(Actions.create, Subject.Note, { orgId: null });
  if (memberOrgIds.length > 0) {
    can(Actions.create, Subject.Note, { orgId: { $in: memberOrgIds } });
    can(Actions.update, Subject.Note, { orgId: { $in: memberOrgIds } });
  }
  can(Actions.update, Subject.Note, { userId });
  cannot(Actions.delete, Subject.Note);

  // ── Orgs ───────────────────────────────────────────────────────────────
  can(Actions.read, Subject.Org);
  can(Actions.create, Subject.Org);
  if (ownerOrgIds.length > 0) {
    can(Actions.update, Subject.Org, { id: { $in: ownerOrgIds } });
    can(Actions.delete, Subject.Org, { id: { $in: ownerOrgIds } });
  }

  // ── OrgMembers ─────────────────────────────────────────────────────────
  can(Actions.read, Subject.OrgMember);
  if (ownerOrgIds.length > 0) {
    can(Actions.create, Subject.OrgMember, { orgId: { $in: ownerOrgIds } });
    can(Actions.update, Subject.OrgMember, { orgId: { $in: ownerOrgIds } });
    can(Actions.delete, Subject.OrgMember, { orgId: { $in: ownerOrgIds } });
  }

  return build(abilityOptions);
}
