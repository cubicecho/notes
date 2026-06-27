# AGENTS.md — CubicEcho Notes

## Project Overview

CubicEcho Notes is an open-source, web-first Markdown notes app built with Expo.
Notes are persisted through the GraphQL server (Apollo Client → Apollo Server →
Drizzle/Postgres). Ownership is **org-based**: every note belongs to an org, and
each user gets an invisible **personal org** on first login that holds their
personal notes (see [`.agents/db-patterns.md`](.agents/db-patterns.md)). Future
iterations add Electron (disk storage) and multi-device sync.

Monorepo: npm workspaces with four packages — `app/` (Expo + React Native Web),
`server/` (Express + Apollo), `db/` (Drizzle + PGLite), `electron/` (placeholder).

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | Expo 55, React 19, Expo Router, NativeWind (Tailwind), Apollo Client |
| Editor   | @uiw/react-md-editor (split pane, web only for MVP) |
| UI       | shadcn/ui primitives, Radix UI, Tailwind CSS |
| State    | React Context + Apollo Client cache |
| API      | Apollo Server 5, Express 4, GraphQL |
| Database | Drizzle ORM, PGLite (embedded Postgres) |
| Testing  | node:test (`node --test`, native TS via `--experimental-strip-types`) |
| Linting  | Biome |
| Runtime  | Node 22+, ESM |

## Commands

All commands run from the **repo root** unless noted.

### Development
```bash
npm run dev          # start both server (4000) and app (8081 web)
npm run dev:app      # Expo web only
npm run dev:server   # GraphQL server only
```

### Quality
```bash
npm run typecheck    # tsc --noEmit across all packages
npm run lint         # biome check .
npm run lint:fix     # biome check --write .  (safe fixes only)
npx biome check --write --unsafe .  # also applies unsafe fixes (e.g. useLiteralKeys)
npm test             # codegen + node --test (always runs codegen first)
                     # discovers server/src/__tests__/**/*.test.ts
```

**After every chunk of work:** run `npm run lint:fix && npm run typecheck` to catch formatting and type issues early. If lint errors remain after `lint:fix`, run `npx biome check --write --unsafe .`.

### Database
```bash
npm run db:generate  # drizzle-kit generate (after schema changes)
npm run db:migrate   # apply pending migrations
npm run db:studio    # Drizzle Studio GUI
```

### GraphQL Codegen
```bash
npm run codegen              # full pipeline: generate:schema → codegen:server → codegen:client
npm run generate:schema      # writes server/src/__generated__/schema.graphql (in-memory PGLite)
                             # uses buildBaseSchema (schema/base.ts) — no permissions/CASL
                             # bindings, so it never imports the files it generates
npm run codegen:server       # generates server/src/__generated__/:
                             #   resolvers.ts       (typescript + typescript-resolvers)
                             #   permissions.ts     (@vantreeseba/graphql-casl-codegen:
                             #                       Subject / typed / ability / AppSubjectMap)
                             #   schema-type-map.ts (@vantreeseba/graphql-mocks-codegen:
                             #                       SchemaTypeMap for buildMocks<SchemaTypeMap>)
npm run codegen:client       # generates app/src/__generated__/
```

### Schema generation notes
- `generate:schema` runs with no env vars (defaults to in-memory PGLite — no pgdata dir needed)
- After any DB schema change: `npm run db:generate && npm run db:migrate && npm run codegen`
- After any custom SDL change (`server/src/schema/extensions.graphql`): `npm run codegen`

### Build
```bash
npm run build        # build app + server
```

## Project Structure

```
notes/
├── app/             # Expo app (@cubicecho/notes-app)
├── server/          # Express + Apollo (@cubicecho/notes-server)
├── db/              # Drizzle + PGLite (@cubicecho/notes-db)
├── electron/        # Electron wrapper placeholder (@cubicecho/notes-electron)
├── AGENTS.md        # ← you are here
├── CLAUDE.md
└── .agents/         # Pattern guides and planning docs
```

## Key Conventions

**Always use curly braces for conditionals — no single-line if bodies:**
```typescript
// bad
if (!user) throw new Error('Not found');

// good
if (!user) {
  throw new Error('Not found');
}
```

**Guard clause order (server resolvers) — auth → existence → ownership:**
Ownership is org-based: check org membership, not `note.userId` (author only).
Most CRUD authorization is enforced declaratively by CASL in
`middleware/permissions/`; hand-write guards only in custom resolvers.
```typescript
if (!context.userId) {
  throw new Error('Not authenticated');
}
const note = await context.db.query.notes.findFirst({ where: { id: args.id } });
if (!note) {
  throw new Error(`Note ${args.id} not found`);
}
const membership = await context.db.query.orgMembers.findFirst({
  where: { orgId: note.orgId, userId: context.userId },
});
if (!membership) {
  throw new Error('Forbidden');
}
```

**Type inference — never duplicate:**
```typescript
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
```

**GraphQL operations must use the typed `graphql()` helper — never raw `gql`:**
```typescript
import { graphql } from '@/__generated__/index.js';
const MY_QUERY = graphql(`query MyNotes { ... }`);
```

**Prefer `package.json` scripts over ad-hoc `npx` invocations.**

## Agent File Convention

All planning, tracking, and pattern guides live in `.agents/`.
Never create these files at the repo root.
Always add new `.agents/` files to the reference list below.

## Agent Reference Files

- [`.agents/project-structure.md`](.agents/project-structure.md) — Full directory tree, DB schema, GraphQL operations, client route table
- [`.agents/client-patterns.md`](.agents/client-patterns.md) — Expo Router, NotesContext (GraphQL), AuthContext, MarkdownEditor, NativeWind patterns
- [`.agents/db-patterns.md`](.agents/db-patterns.md) — Drizzle schema, PGLite dual-backend, query patterns, migrations
- [`.agents/server-patterns.md`](.agents/server-patterns.md) — Apollo Server, resolver authoring, auth chain, codegen pipeline
- [`.agents/todo.md`](.agents/todo.md) — Open features, known issues, deferred work
