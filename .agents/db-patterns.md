# DB Patterns — CubicEcho Notes

## Schema

Tables are defined in `db/src/models/`. All types use Drizzle inference — never
duplicate manually:

```typescript
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
```

## Current Tables

| Table | Key columns |
|-------|------------|
| `users` | id, email |
| `notes` | id, userId (FK→users, author), orgId (NOT NULL FK→orgs), title, content |
| `orgs` | id, name, personalForUserId (nullable unique FK→users, cascade) |
| `org_members` | orgId+userId (composite PK), role (owner\|member) |

**Ownership is org-based.** Every note belongs to an org via a required `orgId`;
`userId` is *author* metadata only and grants no permissions. On first
login/creation each user is provisioned a **personal org** (`name: 'Personal'`,
`personalForUserId = user.id`, with an `owner` membership) — see
`provisionUser` in `db/src/provision.ts`. Personal notes live in that personal
org, so a single org-membership rule covers both personal and shared notes.

The personal org is an invisible implementation detail: it is hidden from
`myOrgs`, and CASL blocks renaming, deleting, or adding members to it. Because
`personalForUserId` cascades, deleting a user deletes their personal org, which
in turn cascades to its notes and memberships.

## Dual-Backend Connection

`db/src/index.ts` picks the backend from environment variables:

- `DATABASE_URL` → postgres.js (production Postgres)
- `PGLITE_DATA_DIR` → PGLite (embedded, persisted to disk)
- Neither set → PGLite in-memory (default for tests, schema generation)

Both must not be set at the same time. The `db` export is the Drizzle instance.

## In-Memory DB for Tests

```typescript
import { createInMemoryDb } from '@cubicecho/notes-db';

const db = await createInMemoryDb(); // new PGlite() + migrate
```

## Query Patterns

```typescript
import { db } from '@cubicecho/notes-db';
import { eq, inArray, desc } from 'drizzle-orm';
import { notes, orgMembers, orgs } from '@cubicecho/notes-db/schema';

// Find one
const note = await db.query.notes.findFirst({ where: { id: someId } });

// The caller's personal-org notes (what `myNotes` returns)
const personalOrg = await db.query.orgs.findFirst({
  where: { personalForUserId: context.userId },
});
const myNotes = personalOrg
  ? await db.select().from(notes)
      .where(eq(notes.orgId, personalOrg.id))
      .orderBy(desc(notes.updatedAt))
  : [];

// All notes across every org the user belongs to
const memberships = await db.query.orgMembers.findMany({
  where: { userId: context.userId },
});
const orgIds = memberships.map((m) => m.orgId);
const orgNotes = orgIds.length > 0
  ? await db.select().from(notes)
      .where(inArray(notes.orgId, orgIds))
      .orderBy(desc(notes.updatedAt))
  : [];

// Insert (orgId is required; userId records the author)
const [created] = await db.insert(notes).values({ userId, orgId, title, content }).returning();

// Update
await db.update(notes)
  .set({ content, title, updatedAt: new Date() })
  .where(eq(notes.id, id));

// Delete
await db.delete(notes).where(eq(notes.id, id));
```

## Migrations

After any schema change:

```bash
npm run db:generate   # generates migration file in db/drizzle/
npm run db:migrate    # applies pending migrations
npm run codegen       # regenerate GraphQL schema + types
```

The `db/src/index.ts` singleton applies migrations automatically on startup
(both PGLite and Postgres backends).

## Adding a New Table

1. Create `db/src/models/my_table.ts` with `pgTable(...)` and inferred type exports
2. Add the export to `db/src/models/index.ts`
3. Add the relation to `db/src/relations.ts`
4. Run `npm run db:generate && npm run db:migrate && npm run codegen`
