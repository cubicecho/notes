import { defineRelations } from 'drizzle-orm';
import { magicLinks } from './models/magic_links.ts';
import { notes } from './models/notes.ts';
import { orgMembers } from './models/org_members.ts';
import { orgs } from './models/orgs.ts';
import { users } from './models/users.ts';

export const relations = defineRelations(
  { users, notes, orgs, orgMembers, magicLinks },
  (r) => ({
    users: {
      notes: r.many.notes({ from: r.users.id, to: r.notes.userId }),
      orgMemberships: r.many.orgMembers({
        from: r.users.id,
        to: r.orgMembers.userId,
      }),
      personalOrg: r.one.orgs({
        from: r.users.id,
        to: r.orgs.personalForUserId,
        optional: true,
      }),
    },
    notes: {
      user: r.one.users({ from: r.notes.userId, to: r.users.id }),
      org: r.one.orgs({ from: r.notes.orgId, to: r.orgs.id }),
    },
    orgs: {
      notes: r.many.notes({ from: r.orgs.id, to: r.notes.orgId }),
      members: r.many.orgMembers({ from: r.orgs.id, to: r.orgMembers.orgId }),
    },
    orgMembers: {
      org: r.one.orgs({ from: r.orgMembers.orgId, to: r.orgs.id }),
      user: r.one.users({ from: r.orgMembers.userId, to: r.users.id }),
    },
  }),
);
