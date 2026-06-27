# Server Patterns — CubicEcho Notes

## Schema Pipeline

```
buildAppSchema(db)          # @vantreeseba/drizzle-graphql auto-generates base SDL
  → applyCustomResolvers()  # loads extensions.graphql via extendSchema + attaches resolvers
  → applyMiddleware()       # graphql-middleware applies permissions from middleware/permissions/
  → export schema           # used by Apollo Server and generate_schema.ts
```

## Custom SDL Extensions

Custom queries/mutations are defined in `server/src/schema/extensions.graphql`.
This file is read at runtime by `applyCustomResolvers` using `extendSchema`.

To add a new custom field:
1. Add it to `extensions.graphql`
2. Attach the resolver in the appropriate `resolvers/*.ts` file
3. Add a permission rule in `middleware/permissions/index.ts`
4. Run `npm run codegen` to update generated types

## Resolver Conventions

Resolvers live in `server/src/schema/resolvers/`. Each file exports a plain resolver
object (`noteResolvers`, `orgResolvers`) that is merged via `mergeResolvers`.

The auto-generated CRUD from drizzle-graphql handles basic operations
(with `singularTypes: true` and `prefixes: { insert: 'create', ... }`):
- `note` / `noteSingle` (query)
- `createNote` / `updateNotes` / `deleteNotes` (mutation)
- Same pattern for `user`, `org`, `orgMember`

Custom resolvers use `delegateToSchema` to forward to auto-generated fields:
- `myNotes` — the caller's **personal-org** notes (looks up the org via
  `personalForUserId`, then delegates to `note` filtered by that `orgId`)
- `myOrgs` — the caller's orgs **excluding** their invisible personal org
- `createOrg` (create + add caller as owner — can't delegate to itself)

User provisioning lives in `db/src/provision.ts` (`provisionUser`): on
login/creation it find-or-creates the user plus their personal org and `owner`
membership in a transaction (idempotent). `requestMagicLink` calls it; tests and
the seed reuse it.

## Permissions

`server/src/middleware/permissions/` is a CASL-backed permission system built on
`graphql-middleware`. It is the sole permissions layer — no separate hand-coded
rules middleware exists.

### Folder layout

```
middleware/permissions/
  utils.ts      — Generic library (no schema imports):
                    SubjectName<TResolvers>, SubjectMap<T, R>, ArgsOf<TField>
                    Rule, PermissionsMap<T>, deny, accept
                    Action, Actions const, AppAbility, abilityOptions
                    createRequireCan<TCtx, TAbility>(), createSubjects<TMap>(),
                    createTyped<TMap>()
  abilities.ts  — App-specific bindings (imports from generated schema):
                    AppSubjectMap = SubjectMap<Resolvers, ResolversTypes>  ← auto-derived
                    AppSubjectName = SubjectName<Resolvers>                ← auto-derived
                    Subject const (User, Note, Org, OrgMember)
                    typed() helper, defineAbilitiesFor()
  index.ts      — Active permissions map:
                    requireCan = createRequireCan<Context, AppAbility>(...)
                    permissions export (PermissionsMap<Resolvers>)
```

### Key concepts

**`SubjectName<TResolvers>`** — derives `'User' | 'Note' | 'Org' | 'OrgMember'` from the
generated `Resolvers` type by excluding root operations (via `OperationTypeNode`) and scalars.

**`SubjectMap<TResolvers, TResolversTypes>`** — maps each subject name to `Partial<ModelType>`
via `ResolversTypes`. Requires `useIndexSignature: false` in `codegen.server.ts` (set).

**`defineAbilitiesFor(userId, memberships, personalOrgId?)`** — builds a per-request CASL
`MongoAbility` with MongoDB-style conditions (`{ id: userId }`, `{ orgId: { $in: ownerOrgIds } }`).
Note authorization is purely org-based (`{ orgId: { $in: memberOrgIds } }` for
create/update/delete); `userId` grants nothing. The optional `personalOrgId`
adds `cannot` rules that block renaming/deleting/sharing the caller's personal
org (these override the owner `can` rules). Subject type detection uses
`__typename` via `abilityOptions.detectSubjectType`.

**`createRequireCan`** — generic factory; the instance in `index.ts` is bound to `Context`
and this app's ability builder. Any project creates its own instance.

**`requireCan<TArgs>(action, subject, getSubjectData?)`** — returns a `Rule` middleware.
Pass a generated arg type for full autocomplete on the callback:
```typescript
requireCan<MutationUpdateUsersArgs>(update, User, (args) => ({
  id: args.where?.id?.eq,   // args fully typed
}))
```

**`ArgsOf<TResolverField>`** — extracts args type from a resolver field:
```typescript
requireCan<ArgsOf<MutationResolvers['updateUsers']>>(...)
```

**`Actions` / `Subject` consts** — use instead of raw strings; TypeScript errors if schema
adds a new type/action and these aren't updated:
```typescript
const { create, read, update, delete: del } = Actions;
const { User, Note, Org, OrgMember } = Subject;
requireCan(read, User)
```

### Adding a new permission rule

1. If the rule checks an ability condition → add/update `defineAbilitiesFor` in `abilities.ts`
2. If the rule gates a field → add to `permissions` map in `index.ts`
3. If the rule is reusable → add to `utils.ts` as a `createRequireCan` factory pattern

## Context

`server/src/index.ts` builds context per request. `getUserMemberships()` is lazy-loaded
and Promise-cached — called at most once per request regardless of how many permission
rules check it:

```typescript
context: async ({ req }) => {
  const userId = req.headers.authorization?.replace('Bearer ', '') ?? DEMO_USER_ID;
  let membershipsPromise: Promise<OrgMembership[]> | undefined;
  return {
    db, userId,
    getUserMemberships: () => {
      if (membershipsPromise === undefined) {
        membershipsPromise = db.query.orgMembers
          .findMany({ where: { userId } })
          .then(ms => ms.map(m => ({ orgId: m.orgId, role: m.role })));
      }
      return membershipsPromise!;
    },
  };
}
```

## Codegen

`useIndexSignature: false` in `codegen.server.ts` is required for `SubjectMap` to work —
it prevents `ResolversTypes` from being wrapped in `WithIndex<T> = T & Record<string, any>`
which would poison all property access with `any`.

After any schema or SDL change:

```bash
npm run generate:schema    # writes server/src/__generated__/schema.graphql (in-memory PGLite)
npm run codegen:server     # writes server/src/__generated__/resolvers.ts
npm run codegen:client     # writes app/src/__generated__/
npm run codegen            # all three in sequence
```

After any DB schema change:
```bash
npm run db:generate && npm run db:migrate && npm run codegen
```
