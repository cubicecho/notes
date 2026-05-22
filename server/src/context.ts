import type { DB } from '@cubicecho/notes-db';

export interface OrgMembership {
  orgId: string;
  role: 'owner' | 'member';
}

export interface Context {
  db: DB;
  userId?: string;
  getUserMemberships: () => Promise<OrgMembership[]>;
}
