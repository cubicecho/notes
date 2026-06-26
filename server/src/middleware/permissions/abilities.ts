/**
 * CASL-based permissions middleware — parallel implementation to permissions/.
 *
 * The subject map, `Subject` const, `typed()` tagger, and `ability()` builder
 * factory are generated from the schema by @vantreeseba/graphql-casl-codegen
 * (see codegen.server.ts) and live alongside the resolver types in
 * __generated__/resolvers.ts — no manual type listing.
 *
 * Abilities are defined per-request via defineAbilitiesFor() using MongoDB-style
 * conditions. Subject type detection uses __typename (already present on all
 * generated GraphQL types).
 *
 *   ability.can('update', typed('User', { id: targetId }))
 */

import { Actions, type GraphQLAbility } from '@vantreeseba/graphql-casl';
import {
  type AppSubjectMap,
  Subject,
  ability,
  typed,
} from '../../__generated__/permissions.ts';
import type { OrgMembership } from '../../context.ts';

export { Actions, Subject, typed };
export type { AppSubjectMap };
export type AppAbility = GraphQLAbility<AppSubjectMap>;

// ---------------------------------------------------------------------------
// defineAbilitiesFor
// ---------------------------------------------------------------------------

export function defineAbilitiesFor(
  userId: string | undefined,
  memberships: OrgMembership[],
): AppAbility {
  const { can, cannot, build } = ability();

  if (!userId) {
    // No rules ⇒ everything denied.
    return build();
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
  // Ownership is purely org-based. Personal notes live in the caller's personal
  // org (an owned membership), so a single membership rule covers both personal
  // and shared notes. `userId` is author metadata only and grants nothing.
  can(Actions.read, Subject.Note);
  if (memberOrgIds.length > 0) {
    can(Actions.create, Subject.Note, { orgId: { $in: memberOrgIds } });
    can(Actions.update, Subject.Note, { orgId: { $in: memberOrgIds } });
    can(Actions.delete, Subject.Note, { orgId: { $in: memberOrgIds } });
  }

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

  return build();
}
