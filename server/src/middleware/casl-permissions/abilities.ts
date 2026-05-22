import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type {
  Resolvers,
  ResolversTypes,
} from '../../__generated__/resolvers.ts';
import type { OrgMembership } from '../../context.ts';
import {
  type Action,
  type AppAbility,
  type SubjectMap,
  type SubjectName,
  abilityOptions,
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

export type { AppAbility, Action };

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
    cannot('manage', 'all');
    return build(abilityOptions);
  }

  const memberOrgIds = memberships.map((m) => m.orgId);
  const ownerOrgIds = memberships
    .filter((m) => m.role === 'owner')
    .map((m) => m.orgId);

  // ── Users ──────────────────────────────────────────────────────────────
  cannot('create', 'User');
  cannot('delete', 'User');
  can('read', 'User');
  can('update', 'User', { id: userId });

  // ── Notes ──────────────────────────────────────────────────────────────
  can('read', 'Note');
  can('create', 'Note', { orgId: null });
  if (memberOrgIds.length > 0) {
    can('create', 'Note', { orgId: { $in: memberOrgIds } });
    can('update', 'Note', { orgId: { $in: memberOrgIds } });
  }
  can('update', 'Note', { userId });
  cannot('delete', 'Note');

  // ── Orgs ───────────────────────────────────────────────────────────────
  can('read', 'Org');
  can('create', 'Org');
  if (ownerOrgIds.length > 0) {
    can('update', 'Org', { id: { $in: ownerOrgIds } });
    can('delete', 'Org', { id: { $in: ownerOrgIds } });
  }

  // ── OrgMembers ─────────────────────────────────────────────────────────
  can('read', 'OrgMember');
  if (ownerOrgIds.length > 0) {
    can('create', 'OrgMember', { orgId: { $in: ownerOrgIds } });
    can('update', 'OrgMember', { orgId: { $in: ownerOrgIds } });
    can('delete', 'OrgMember', { orgId: { $in: ownerOrgIds } });
  }

  return build(abilityOptions);
}
