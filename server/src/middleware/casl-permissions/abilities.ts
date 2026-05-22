import {
  AbilityBuilder,
  type ForcedSubject,
  type MongoAbility,
  createMongoAbility,
} from '@casl/ability';
import type { OrgMembership } from '../../context.ts';

// ---------------------------------------------------------------------------
// Subject attribute interfaces
// Each interface defines the fields CASL conditions can match against.
// ForcedSubject<'Name'> tags objects so CASL routes them to the right rules.
// ---------------------------------------------------------------------------

export interface UserAttrs {
  id?: string;
}

export interface NoteAttrs {
  userId?: string;
  orgId?: string | null;
}

export interface OrgAttrs {
  id?: string;
}

export interface OrgMemberAttrs {
  orgId?: string;
  userId?: string;
}

type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';

type Subjects =
  | (UserAttrs & ForcedSubject<'User'>)
  | (NoteAttrs & ForcedSubject<'Note'>)
  | (OrgAttrs & ForcedSubject<'Org'>)
  | (OrgMemberAttrs & ForcedSubject<'OrgMember'>)
  | 'User'
  | 'Note'
  | 'Org'
  | 'OrgMember'
  | 'all';

export type AppAbility = MongoAbility<[Action, Subjects]>;

// ---------------------------------------------------------------------------
// defineAbilitiesFor
//
// Builds a per-request AppAbility from the caller's userId and memberships.
// Rules use MongoDB-style conditions so CASL can check tagged subjects like:
//   ability.can('update', subject('User', { id: targetId }))
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
    return build();
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
  // Personal note (no org)
  can('create', 'Note', { orgId: null });
  // Org notes — only in orgs the caller is a member of
  if (memberOrgIds.length > 0) {
    can('create', 'Note', { orgId: { $in: memberOrgIds } });
    can('update', 'Note', { orgId: { $in: memberOrgIds } });
  }
  // Own personal notes
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

  return build();
}
