import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { orgs } from './orgs.ts';
import { users } from './users.ts';

// API tokens grant programmatic access to a single org (scoped by `orgId`). A
// caller wanting access to two orgs creates one token per org. The token acts
// with the creating user's live membership role in that org, so revoking the
// user's membership also disables the token.
//
// Only the SHA-256 hash of the token is stored — the plaintext is shown once at
// creation time and never persisted. This table is deliberately kept out of
// `relations.ts` so @vantreeseba/drizzle-graphql never auto-generates CRUD for
// it (which would expose `tokenHash`); all access goes through curated
// resolvers that return a hash-free `ApiToken` GraphQL type.
export const apiTokens = pgTable('api_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgs.id, { onDelete: 'cascade' }),
  // Author — who minted the token. Cascades so deleting the user drops it.
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Human-friendly label, e.g. "CI deploy".
  name: text('name').notNull(),
  // Non-secret display prefix (e.g. `cet_a1b2c3d4`) so the UI can identify a
  // token without ever holding the full value.
  tokenPrefix: text('token_prefix').notNull(),
  // SHA-256 hex digest of the full token. Looked up on every authenticated
  // request, hence unique.
  tokenHash: text('token_hash').notNull().unique(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type ApiToken = typeof apiTokens.$inferSelect;
export type NewApiToken = typeof apiTokens.$inferInsert;
