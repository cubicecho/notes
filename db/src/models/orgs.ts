import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.ts';

export const orgs = pgTable('orgs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  // When set, this org is the personal org owned by the referenced user. One
  // personal org per user (unique); shared orgs leave this null. Deleting the
  // user cascades the personal org away (and its notes/members via their FKs).
  personalForUserId: uuid('personal_for_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Org = typeof orgs.$inferSelect;
export type NewOrg = typeof orgs.$inferInsert;
