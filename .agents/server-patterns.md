# Server Patterns — CubicEcho Notes

## Schema Pipeline

```
buildAppSchema(db)          # @vantreeseba/drizzle-graphql auto-generates base SDL
  → applyCustomResolvers()  # loads extensions.graphql via extendSchema + attaches resolvers
  → applyMiddleware()       # graphql-middleware applies permissions from middleware/permissions.ts
  → export schema           # used by Apollo Server and generate_schema.ts
```

## Custom SDL Extensions

Custom queries/mutations are defined in `server/src/schema/extensions.graphql`.
This file is read at runtime by `applyCustomResolvers` using `extendSchema`.

To add a new custom field:
1. Add it to `extensions.graphql`
2. Attach the resolver in the appropriate `resolvers/*.ts` file
3. Add a permission rule in `middleware/permissions.ts` if it needs auth
4. Run `npm run codegen` to update generated types

## Resolver Conventions

Resolvers live in `server/src/schema/resolvers/`. Each file exports an `applyXResolvers(queryFields, mutationFields)` function that attaches `.resolve` to the SDL-defined fields.

The auto-generated CRUD from drizzle-graphql handles basic operations:
- `notes` / `notesSingle` (query)
- `insertIntoNotes` / `updateNotes` / `deleteFromNotes` (mutation)
- Same pattern for `users`, `orgs`, `orgMembers`

Custom resolvers are for user-scoped or multi-step operations only:
- `myNotes`, `myOrgs` (auth-scoped queries)
- `createOrg` (create + add owner in one step)
- `createNote` (validates org membership if orgId provided)
- `addOrgMember`, `removeOrgMember` (ownership-gated)

## Auth / Permissions

`server/src/middleware/permissions.ts` uses `graphql-middleware` to apply per-field auth.

> **Note:** `graphql-shield` v7 is incompatible with Node ≥ 22 (uses removed `util.isUndefined`).
> Permissions are implemented with `graphql-middleware` directly using the same pattern.

```typescript
// middleware/permissions.ts
const requireAuth: IMiddlewareFunction<unknown, Context> = async (resolve, parent, args, context, info) => {
  if (!context.userId) throw new Error('Not authenticated');
  return resolve(parent, args, context, info);
};

export const permissions = {
  Query: { myNotes: requireAuth, myOrgs: requireAuth },
  Mutation: { createOrg: requireAuth, /* ... */ },
};
```

## Auth Context

`server/src/index.ts` builds context per request:

```typescript
context: async ({ req }) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = token ?? DEMO_USER_ID;
  return { db, userId };
}
```

For MVP, any bearer token is treated as a userId. Real JWT auth goes here.

## Guard Clause Order in Business-Logic Resolvers

Always: auth → existence → ownership

```typescript
if (!callerMembership) throw new Error('Not a member of this org');
if (callerMembership.role !== 'owner') throw new Error('Only org owners can ...');
const org = await context.db.query.orgs.findFirst({ where: { id: args.orgId } });
if (!org) throw new Error(`Org ${args.orgId} not found`);
```

## Codegen

After any schema or SDL change:

```bash
npm run generate:schema    # writes server/src/__generated__/schema.graphql (in-memory PGLite)
npm run codegen:server     # writes server/src/__generated__/resolvers.ts
npm run codegen:client     # writes app/src/__generated__/
npm run codegen            # all three in sequence
```

Generated files are in `__generated__/` dirs.
