# Project Structure — CubicEcho Notes

## Overview

CubicEcho Notes is a web-first Markdown notes app. MVP stores notes in
`localStorage`. The server and DB are scaffolded but not wired to the client yet.

| Package | Role |
|---------|------|
| `app/` | Expo 55 + React Native Web + Expo Router — the main client |
| `server/` | Express + Apollo Server + GraphQL (scaffolded) |
| `db/` | Drizzle ORM + PGLite (notes + users schema) |
| `electron/` | Placeholder — will wrap `app/dist/` in a desktop shell |

---

## `app/` — Expo Client

```
app/
├── app.json                        # Expo config (slug: cubicecho-notes)
├── babel.config.js                 # Expo preset + module-resolver (@/ → src/)
├── metro.config.js                 # Monorepo watchFolders + NativeWind
├── tailwind.config.ts              # shadcn CSS vars + NativeWind preset
├── global.css                      # @tailwind directives (NativeWind entry)
├── nativewind-env.d.ts             # /// <reference types="nativewind/types" />
├── tsconfig.json                   # extends expo/tsconfig.base, paths: @/* → src/*
├── app/
│   ├── _layout.tsx                 # Root: ApolloProvider + NotesProvider + Stack
│   ├── index.tsx                   # Redirect to /(app)
│   └── (app)/
│       ├── _layout.tsx             # Sidebar layout (web) | Slot (native)
│       ├── index.tsx               # Empty state "select or create a note"
│       └── notes/
│           └── [noteId].tsx        # MarkdownEditor for selected note
└── src/
    ├── index.css                   # CSS custom properties (shadcn theme vars)
    ├── apollo-client.ts            # ApolloClient pointing at localhost:4000
    ├── lib/
    │   ├── auth.ts                 # DEMO_USER_ID + getToken/setToken/clearToken
    │   ├── storage.ts              # localStorage wrapper (web only, safe on native)
    │   └── utils.ts                # cn() — clsx + tailwind-merge
    ├── context/
    │   └── NotesContext.tsx        # Notes CRUD + localStorage persistence
    └── components/
        ├── ui/
        │   └── button.tsx          # shadcn Button (cva variants)
        └── domain/
            ├── sidebar/
            │   ├── NotesList.tsx   # Sidebar list + "+" create button
            │   └── NoteItem.tsx    # Title + relative timestamp
            └── editor/
                └── MarkdownEditor.tsx  # @uiw/react-md-editor (web only)
```

### Route Table

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/index.tsx` | Redirects to `/(app)` |
| `/(app)` | `app/(app)/index.tsx` | Empty state / no note selected |
| `/(app)/notes/[noteId]` | `app/(app)/notes/[noteId].tsx` | Note editor |

### Data Flow (MVP)

```
NotesProvider (localStorage)
  └── NotesList ──────────── reads notes[], navigates on select
  └── [noteId].tsx ────────── finds note by ID
      └── MarkdownEditor ─── calls updateNote() on every keystroke
```

---

## `db/` — Database Layer

```
db/
├── drizzle.config.ts      # Drizzle Kit config (PGLite default, Postgres via DATABASE_URL)
├── tsconfig.json
├── drizzle/               # Generated migrations (never edit manually)
└── src/
    ├── index.ts           # PGLite/Postgres dual-backend singleton
    ├── schema.ts          # Re-exports all models
    ├── relations.ts       # Drizzle relation definitions
    ├── migrate.ts         # CLI migration runner
    ├── seed.ts            # seedDemoUser(), seedDemoData()
    └── models/
        ├── index.ts
        ├── users.ts       # id, email, createdAt, updatedAt
        └── notes.ts       # id, userId, title, content, createdAt, updatedAt
```

### DB Schema

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | defaultRandom() |
| email | text | unique, notNull |
| created_at | timestamp | defaultNow() |
| updated_at | timestamp | defaultNow() |

#### `notes`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | defaultRandom() |
| user_id | uuid FK → users.id | cascade delete |
| org_id | uuid FK → orgs.id | nullable, cascade delete |
| title | text | default 'Untitled' |
| content | text | default '' |
| created_at | timestamp | defaultNow() |
| updated_at | timestamp | defaultNow() |

#### `orgs`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | defaultRandom() |
| name | text | notNull |
| created_at | timestamp | defaultNow() |
| updated_at | timestamp | defaultNow() |

#### `org_members`
| Column | Type | Notes |
|--------|------|-------|
| org_id | uuid FK → orgs.id | cascade delete, part of composite PK |
| user_id | uuid FK → users.id | cascade delete, part of composite PK |
| role | enum (owner\|member) | default 'member' |
| created_at | timestamp | defaultNow() |

---

## `server/` — GraphQL API

```
server/
├── generate_schema.ts            # Writes src/__generated__/schema.graphql (in-memory PGLite)
├── tsconfig.json
└── src/
    ├── index.ts                  # Express + Apollo Server (port 4000)
    ├── context.ts                # Context: { db, userId?, getUserMemberships() }
    ├── middleware/
    │   └── permissions/
    │       ├── utils.ts          # Generic library: SubjectName, SubjectMap, ArgsOf,
    │       │                     #   Rule, PermissionsMap, deny/accept, Actions,
    │       │                     #   AppAbility, createRequireCan, createSubjects, createTyped
    │       ├── abilities.ts      # App bindings: AppSubjectMap (auto-derived), Subject const,
    │       │                     #   typed(), defineAbilitiesFor() (CASL MongoAbility)
    │       └── index.ts          # permissions export: requireCan instance + PermissionsMap
    ├── schema/
    │   ├── index.ts              # buildAppSchema(db): drizzle-graphql + extensions + permissions
    │   ├── extensions.graphql    # Custom SDL: myNotes, myOrgs, createOrg
    │   └── resolvers/
    │       ├── notes.ts          # noteResolvers: myNotes (delegates to note query)
    │       └── orgs.ts           # orgResolvers: myOrgs, createOrg (delegates + adds owner)
    ├── __tests__/
    │   ├── helpers/
    │   │   └── db.ts             # createTestContext(), first() helper
    │   └── resolvers/
    │       ├── abilities.test.ts # CASL ability unit tests (pure, no GraphQL)
    │       ├── notes.test.ts     # Notes resolver integration tests
    │       ├── orgs.test.ts      # Orgs resolver integration tests
    │       └── permissions.test.ts # Permission middleware integration tests
    └── __generated__/            # schema.graphql + resolvers.ts (codegen output)
```

---

## `electron/` — Desktop Wrapper (Placeholder)

```
electron/
├── package.json           # @cubicecho/notes-electron
└── README.md              # Implementation plan
```

Planned: Electron main process loads `app/dist/`, exposes file-system IPC for
disk-based note storage.
