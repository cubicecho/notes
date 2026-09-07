# Vault Architecture — What This Is vs. Obsidian, and a Minimal File-Backed Redesign

Status: design exploration. Nothing here is implemented.
Written 2026-09-05.

---

## 1. What this project actually is today

Read the code, not the marketing: CubicEcho Notes is **a multi-tenant SaaS CRUD
app that happens to store Markdown in a text column.**

The spine of the repo is a codegen pipeline, not a notes app:

```
db/src/models/*.ts          Drizzle table definitions (users, orgs, org_members, notes, magic_links)
        │
        ▼  @vantreeseba/drizzle-graphql buildSchema()
server/src/schema/base.ts   auto-generated CRUD: note/noteSingle/createNote/updateNotes/deleteNotes
        │                   + rich filter inputs (NoteFilters: eq/ne/like/ilike/inArray/isNull/OR)
        │                   + extensions.graphql hand-written SDL (myNotes, myOrgs, me, magic links)
        ▼
server/src/__generated__/   schema.graphql → resolvers.ts, permissions.ts, schema-type-map.ts
        │
        ├─▶ server/src/middleware/permissions/  CASL abilities keyed off generated Subject map
        │                                       applyPermissions() wraps every resolver field
        └─▶ app/src/__generated__/              typed graphql() client documents
```

Properties worth naming, because they're the things worth *keeping*:

- **The schema is derived, never hand-maintained.** One table definition produces
  SDL, resolver types, CASL subject bindings, mock types, and client types.
- **Authorization is a declarative map, not scattered guards.**
  `PermissionsMap<Resolvers>` in `server/src/middleware/permissions/index.ts`
  names every field once (`canUser(update, Note, args => ({ userId }))`,
  `deny`, `accept`). Anything unlisted is a hole you can see in one file.
- **A generic filter/mutation surface.** The client never needs a bespoke
  endpoint — `note(where: { orgId: { eq: $id } })` covers most of it.
- **Notes are rows.** `notes` = `id, userId, orgId, title, content, timestamps`.
  There is no path, no folder, no link graph, no tags, no frontmatter.
- **Sharing is first-class.** orgs + org_members + API tokens + magic-link auth.

The client (`app/`) is Expo + React Native Web, Apollo, `@uiw/react-md-editor`,
with `WorkspaceContext` switching between "personal" and one org — which is the
closest thing the app currently has to a vault.

---

## 2. The main difference vs. Obsidian

**One sentence: Obsidian is an editor pointed at a folder you own; this is a
server that owns the notes and hands out an API.**

Everything else follows from that.

| | Obsidian | CubicEcho Notes (today) |
|---|---|---|
| Source of truth | `.md` files on disk in a vault folder | Postgres/PGLite `notes` rows |
| Folder structure | Is the data model — moving a file *is* the mutation | Doesn't exist; a note has no path |
| Metadata | YAML frontmatter in each file; `.obsidian/` per-vault config | SQL columns + a migration to change them |
| Query layer | Bases (`.base` files) / Dataview read frontmatter at runtime; local index rebuilt from files | GraphQL + generated `NoteFilters`, executed by Postgres |
| Links | `[[wikilinks]]`, backlinks, graph view — parsed from content | None |
| Architecture | Local-first, no server, no network required; sync is a separate paid add-on | Client/server; app is useless without the API |
| Programmatic access | Plugin API inside the app; HTTP only via a community plugin | GraphQL is the *only* interface |
| Multi-user | Not a concept | orgs, members, CASL abilities, API tokens |
| Failure mode | App breaks → you still have a folder of Markdown | DB breaks → you have a pg dump, at best |
| Extensibility | ~2k community plugins, themes, canvas, mobile apps | Whatever you write |

The deep philosophical split is **durability vs. capability**:

- Obsidian deliberately refuses to own your data. Every feature must be
  expressible as files-plus-a-derived-index, because the index is disposable.
  That's why Bases stores *view config* in `.base` files and keeps the *data* in
  each note's frontmatter — the database can always be thrown away and rebuilt.
- This project deliberately owns the data, because owning it is what buys you
  server-side filtering, permissions, multi-user sharing, and one typed API for
  every client. The price is that the notes only exist as rows.

Note that both of them *do* have an index over a schema — Obsidian's is
in-memory and rebuildable, this one is Postgres and authoritative. That's the
hinge the redesign below turns on.

---

## 3. The minimal Obsidian, keeping this project's concepts

### 3.1 Requirements, restated

1. Notes are only `.md` files on disk. The folder tree is the organization.
2. Vault-root metadata makes the tree queryable/mutable over GraphQL, no DB of record.
3. Personal use: one server process, a root dir on a NAS, N vaults under it.

### 3.2 The one idea that makes it work

**Swap the source of the generated schema, keep the entire pipeline.**

```
today:      drizzle tables ──▶ buildSchema() ──▶ SDL ──▶ codegen ──▶ resolvers + CASL + client types
proposed:   vault schema.yaml ──▶ buildVaultSchema() ──▶ SDL ──▶ (identical codegen, CASL, client)
```

The filter inputs, the `PermissionsMap`, the typed `graphql()` documents, the
mock codegen — all of it survives. What changes is what sits behind the
resolvers: a filesystem + a **disposable index**, instead of Postgres.

The rule that keeps you honest, borrowed straight from Obsidian:

> **`rm -rf` the index at any time and the server rebuilds it from the `.md`
> files with zero data loss.** If a fact can't be recovered by re-reading the
> vault, it does not belong in the index.

That's the difference between "a cache" and "a database", and it's the whole
answer to requirement 2.

### 3.3 On-disk layout

```
/nas/notes/                         ← NOTES_ROOT (server points here)
├── personal/                       ← a vault (any dir containing .ce/)
│   ├── .ce/
│   │   ├── vault.json              ← identity + config (committed, human-edited)
│   │   ├── schema.yaml             ← property definitions → GraphQL types
│   │   └── cache/                  ← DISPOSABLE. gitignored. never read as truth.
│   │       ├── index.sqlite        (or index.json for small vaults)
│   │       └── .gitignore          ("*")
│   ├── daily/2026-09-05.md
│   ├── projects/notes-rewrite.md
│   └── attachments/diagram.png
├── work/
│   └── .ce/vault.json
└── archive/
    └── .ce/vault.json
```

`.ce/vault.json`:

```json
{
  "id": "018f...ulid",
  "name": "Personal",
  "createdAt": "2026-09-05T00:00:00Z",
  "noteIdStrategy": "frontmatter",
  "ignore": ["attachments/**", ".obsidian/**", "**/.trash/**"],
  "defaultExtension": ".md"
}
```

`.ce/schema.yaml` — the piece that replaces `db/src/models/notes.ts`:

```yaml
properties:
  title:     { type: string,   required: true, from: "h1|filename" }
  tags:      { type: [string] }
  status:    { type: enum, values: [inbox, active, done] }
  due:       { type: date }
  project:   { type: ref, vaultRelative: true }   # a [[wikilink]] to another note
```

Everything in `schema.yaml` becomes a GraphQL field on `Note` **and** a filter
on `NoteFilters` — same generation step as Drizzle columns today. Unknown
frontmatter keys survive round-trips untouched and are exposed as a
`frontmatter: JSON` escape hatch, so a stray key never fails a write.

Per-note metadata lives in the file, exactly like Obsidian:

```markdown
---
id: 018f6a2c-...          # stable across renames/moves — the note's real identity
created: 2026-09-05
tags: [architecture, notes]
status: active
---

# Notes rewrite

Body, with [[projects/notes-rewrite]] links.
```

The `id` in frontmatter is what makes "the folder structure already works"
compatible with a stable API: a client can hold a note id across a rename or a
move done by any other tool, including Obsidian itself or `mv`.

### 3.4 GraphQL surface

```graphql
type Vault {
  id: ID!            # from .ce/vault.json
  name: String!
  path: String!      # relative to NOTES_ROOT
  noteCount: Int!
  schema: JSON!      # .ce/schema.yaml, so a client can render dynamic columns
}

type Note {
  id: ID!            # frontmatter id
  vaultId: ID!
  path: String!      # "projects/notes-rewrite.md" — vault-relative, POSIX separators
  folder: String!    # "projects"
  name: String!      # "notes-rewrite"
  title: String!
  content: String!   # body WITHOUT frontmatter
  raw: String!       # full file, frontmatter included
  hash: String!      # content hash — used for optimistic concurrency
  mtime: DateTime!
  size: Int!
  frontmatter: JSON!
  # generated from schema.yaml:
  tags: [String!]!
  status: NoteStatus
  due: Date
  # derived at index time:
  links: [Note!]!
  backlinks: [Note!]!
}

type Query {
  vaults: [Vault!]!
  vault(id: ID!): Vault
  tree(vaultId: ID!, path: String): [TreeEntry!]!            # folders as first-class
  notes(vaultId: ID!, where: NoteFilters, orderBy: NoteOrderBy, limit: Int, offset: Int): [Note!]!
  note(vaultId: ID!, id: ID, path: String): Note             # by either identity
  search(vaultId: ID!, query: String!, limit: Int): [SearchHit!]!   # FTS, snippets
}

type Mutation {
  createNote(vaultId: ID!, path: String!, content: String, frontmatter: JSON): Note!
  updateNote(vaultId: ID!, id: ID!, content: String, frontmatter: JSON, expectedHash: String): Note!
  moveNote(vaultId: ID!, id: ID!, toPath: String!): Note!    # rename == mv, updates backlinks
  deleteNote(vaultId: ID!, id: ID!): Boolean!                # → .trash/, not unlink
  createFolder(vaultId: ID!, path: String!): TreeEntry!
  moveFolder(vaultId: ID!, from: String!, to: String!): TreeEntry!
}

type Subscription {
  noteChanged(vaultId: ID!): NoteEvent!   # from the file watcher — external edits push to clients
}
```

Three things to notice:

- **`path` and `folder` are real fields**, so the sidebar renders a tree and
  `where: { folder: { like: "projects/%" } }` is a normal query. That is the
  "folder structure already works" requirement expressed in the API.
- **`expectedHash` on update** is the compare-and-swap that replaces DB
  transactions. If the file changed under you (Obsidian on your laptop, a
  `sed`, a sync client), the mutation fails loudly instead of clobbering.
- **A subscription is not optional here.** Unlike a DB, the store mutates behind
  your back. The watcher is the only thing keeping open clients honest.

### 3.5 The index

Build it at boot, keep it in sync with a watcher, and never trust it further
than an mtime:

```
boot → walk vault (respecting .ce/vault.json ignore globs)
     → for each .md: stat, read, parse frontmatter (gray-matter), parse [[links]]
     → upsert row {id, path, hash, mtime, size, frontmatter, links[], title}
     → prune rows whose file vanished
watch (chokidar; usePolling:true on NAS/SMB/NFS) → debounce 100ms → re-index that one file
```

Two implementations, pick by vault size:

- **In-memory Map + JSON cache file** — trivially correct, ~200 lines, no
  dependency. Fine to about 10k notes (frontmatter only, bodies read on demand);
  a cold walk of 5k files on a NAS is a few seconds, and the JSON cache keyed by
  `path→{mtime,hash}` makes restarts near-instant.
- **SQLite + FTS5** — once you want full-text search with snippets and ranking,
  or you cross ~20k notes. Still disposable, still under `.ce/cache/`.

Full-text without SQLite: shell out to `rg --json`. On a NAS this is often
faster than anything you'll write, and it's zero state.

### 3.6 Write path

Every mutation is: **validate → write file atomically → re-index synchronously →
return the fresh node.** Never write the index first.

```
1. resolve id → path via index                (404 if unknown)
2. if expectedHash given and != current hash  → throw ConflictError
3. serialize: frontmatter (key order preserved) + body
4. write to <path>.tmp-<pid> ; fsync ; rename over target   ← atomic on same fs
5. re-index that path inline (don't wait for the watcher event)
6. return Note
```

Details that will bite you if skipped:

- **Path safety.** Resolve, then assert the result is still under the vault
  root. Reject `..`, absolute paths, NUL bytes, and Windows reserved names.
  This is the single most important guard in the whole server — a path traversal
  here is arbitrary file write on your NAS.
- **Deletes go to `.trash/`** with a timestamp suffix. Cheap undo; no `unlink`.
- **Moves preserve id**, and should rewrite `[[wikilinks]]` in backlinking notes
  (that's why the index tracks links).
- **Frontmatter round-trip must be lossless** — preserve key order, comments if
  you can, and don't reformat lists. Otherwise every API touch produces a
  gratuitous diff in git and a conflict in Obsidian Sync.
- **NAS reality:** `fs.watch`/inotify does not work over SMB/NFS. Use chokidar
  with `usePolling: true, interval: 2000` for network mounts, and accept ~2s
  latency on external edits. Also: case-insensitive filesystems mean
  `Note.md` and `note.md` collide — normalize and reject on create.

### 3.7 Multi-vault + auth

`NOTES_ROOT=/nas/notes`; on boot, scan one level (or N, configurable) for dirs
containing `.ce/vault.json`. Each becomes a `Vault`. Adding a vault = `mkdir` +
drop a `vault.json` in; the watcher can pick that up too.

Auth stays as-is but shrinks: keep magic-link + API tokens (already built,
already useful for scripts/agents), drop `orgs`/`org_members`. CASL abilities
become path-scoped rather than org-scoped:

```ts
can(read,   Note, { vaultId: { $in: readableVaultIds } });
can(update, Note, { vaultId: { $in: writableVaultIds } });
cannot(update, Note, { path: { $regex: '^\\.ce/' } });   // config is not a note
```

Vault ACLs live in a small server-side config (`vaults.json` next to `.env`), not
in the vault — the vault should stay portable and mountable by Obsidian without
carrying your server's auth model around.

### 3.8 What that means for this repo

Keep:

- The codegen philosophy and pipeline (`codegen.server.ts`, `codegen.ts`).
- `@vantreeseba/graphql-casl` + `PermissionsMap` — it applies to file resolvers
  unchanged, and is more valuable when the backing store has no `WHERE` clause
  to lean on.
- Generated filter/orderBy input shapes. Hand-write the generator against
  `schema.yaml`; the SDL shape can be copied from the current
  `server/src/__generated__/schema.graphql`.
- Magic link + API tokens, the Apollo/Express server, the Docker packaging,
  the Expo web client, `WorkspaceContext` (rename it → `VaultContext`).

Delete:

- `db/` entirely: Drizzle, PGLite, migrations, `pgdata/`, `db:*` scripts,
  `docker-compose.postgres.yml`.
- `orgs`, `org_members`, and the org half of the abilities and permissions maps.
- `@vantreeseba/drizzle-graphql`.

Add:

- `server/src/vault/` — `scan.ts`, `index.ts`, `watch.ts`, `paths.ts`,
  `frontmatter.ts`, `links.ts`, `write.ts`.
- `server/src/schema/vault-schema.ts` — `schema.yaml` → SDL generator.
- A tree view in the sidebar (this is the visible product change; a flat list is
  the wrong UI once paths exist).

Rough sequencing, each step shippable:

1. Read-only: scan + in-memory index + `vaults`/`notes`/`note`/`tree`. No writes.
2. Writes: atomic write, `expectedHash`, `.trash/` deletes, inline re-index.
3. Watcher + subscription; client tree UI.
4. `schema.yaml`-driven typed properties and generated filters.
5. Links/backlinks; then FTS (ripgrep or SQLite FTS5) when search gets slow.

---

## 4. Honest tradeoffs

**What you gain over Obsidian:** a real API over the vault from anything on the
network — phone browser, scripts, agents, cron — without a plugin; server-side
permissions; a vault that stays readable when the app is gone.

**What you give up:** the plugin ecosystem, canvas, graph view, live-preview
editing quality, mobile offline, and community themes. Also true offline use —
this is a thin client against a NAS; if the NAS is down you have nothing, where
Obsidian would still be editing local files. If offline matters, the honest
answer is to keep Obsidian as the editor and run this server as the *API over
the same folder* — they can coexist, because both treat the files as truth.
That coexistence is the strongest argument for this design.

**What genuinely gets harder than SQL:** no transactions across notes, no joins,
no unique constraints, no atomic multi-file rename. Filesystem race conditions
are real and the `expectedHash` CAS is the only thing standing between you and
silent overwrites. Sorting/filtering on a property means it must be in the index,
so an index rebuild is the migration mechanism — cheaper than Drizzle
migrations, but it is not free at 50k notes.

**Where it stops being minimal:** the moment you want two people editing the
same vault concurrently, or a sync client with proper conflict resolution. Both
are hard problems that Obsidian charges money for. Personal, single-writer,
NAS-hosted is exactly the regime where the file-as-truth design is simple.

---

## 5. Prior art worth reading before writing code

- **[SilverBullet](https://alternativeto.net/software/silverbullet/about/)** —
  self-hosted, single binary/Docker, pages are plain `.md` in a "space" folder,
  with a scripting layer to query notes like a database. This is the closest
  existing thing to the design above; steal its space/index model.
- **[Obsidian Bases](https://got.md/obsidian-bases/)** and
  **[Properties](https://www.dsebastien.net/the-complete-guide-to-obsidian-properties/)**
  — the reference design for "frontmatter is the schema, view config is a
  separate file, the index is disposable."
- **[MarkdownDB](https://markdowndb.com/)** — indexes a folder of Markdown into
  SQLite (frontmatter, tags, links, tasks) with a JS query API. Effectively the
  index layer of §3.5, already written.
- **[markdown-vault-mcp](https://github.com/pvliesdonk/markdown-vault-mcp)** and
  **[mdvault](https://github.com/agustinvalencia/mdvault)** — FTS5 +
  frontmatter-aware indexing with hash-based incremental reindexing over a
  vault. Same problem, MCP instead of GraphQL; the indexing strategy transfers
  directly.
- **[Gatsby's GraphQL data layer](https://www.gatsbyjs.com/docs/how-to/routing/adding-markdown-pages/)**
  — the original "GraphQL over a folder of Markdown + frontmatter" pattern.
  Build-time rather than live, but the node/transformer split is instructive.
