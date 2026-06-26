import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { orgs } from './orgs.ts';
import { users } from './users.ts';

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgs.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Untitled'),
  content: text('content').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
