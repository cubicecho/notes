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
| `notes` | id, userId (FK→users), orgId (nullable FK→orgs), title, content |
| `orgs` | id, name |
| `org_members` | orgId+userId (composite PK), role (owner\|member) |

A note with `orgId = null` is personal (owned by the user). A note with `orgId` set belongs to that org and is visible to all org members.

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
import { eq, or, inArray, desc } from 'drizzle-orm';
import { notes, orgMembers } from '@cubicecho/notes-db/schema';

// Find one
const note = await db.query.notes.findFirst({
  where: { id: someId, userId: context.userId },
});

// List all for user + org notes
const memberships = await db.query.orgMembers.findMany({
  where: { userId: context.userId },
});
const orgIds = memberships.map((m) => m.orgId);
const myNotes = orgIds.length > 0
  ? await db.select().from(notes)
      .where(or(eq(notes.userId, context.userId), inArray(notes.orgId, orgIds)))
      .orderBy(desc(notes.updatedAt))
  : await db.select().from(notes)
      .where(eq(notes.userId, context.userId))
      .orderBy(desc(notes.updatedAt));

// Insert
const [created] = await db.insert(notes).values({ userId, title, content }).returning();

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
