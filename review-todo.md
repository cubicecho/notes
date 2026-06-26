# Code review — follow-up todos

Branch `feat/org-based-ownership` (org ownership + API tokens + dual auth + MCP).
Ranked most-severe first. Checkboxes are unstarted.

## Critical

- [ ] **1. Magic-link auto-CRUD is publicly exposed → full account takeover.**
  `server/src/middleware/permissions/index.ts` — the permissions map only lists
  `requestMagicLink`/`verifyMagicLink`. The drizzle-graphql auto-generated root
  fields `magicLink`, `magicLinkSingle`, `createMagicLink(s)`,
  `updateMagicLinks`, `deleteMagicLinks` are **absent**, and graphql-middleware
  guards only listed fields (unlisted = public). `MagicLink.token: String!` is
  exposed (schema line 563).
  Attack: unauthenticated `mutation { createMagicLink(values: { email: "victim@x",
  token: "known", expiresAt: "2030-01-01", used: false }) { id } }` then
  `verifyMagicLink(token: "known")` → session for any email. `query { magicLink
  { email token } }` also dumps all outstanding tokens. **Now also reachable as
  MCP tools** (the new `/mcp` exposes every root field). Fix: default-deny
  baseline, or explicitly `deny` all magic-link CRUD fields; consider excluding
  `magic_links` from auto-CRUD entirely.

## High

- [ ] **2. `notes.org_id SET NOT NULL` migration has no backfill.**
  `db/drizzle/20260626203113_legal_jackal/migration.sql:2`. Any DB with existing
  `org_id IS NULL` notes (the prior representation of personal notes) aborts the
  migration with "column org_id contains null values" — **observed when booting
  the dev server**. Also: existing users have no personal org until next login,
  and legacy personal notes (null org) vanish from `myNotes`. Fix: data migration
  that provisions a personal org per user and backfills `org_id` before the NOT
  NULL constraint.

- [ ] **3. API-token org confinement is broken on the read side.**
  `server/src/middleware/permissions/abilities.ts:58,69,77` — `can(read, Note)`,
  `can(read, User)`, `can(read, Org)` are unconditional. A token scoped to org A
  can `note(where: { orgId: { eq: <orgB> } })` to read another org's notes,
  `user(where: {})` to enumerate every user + email, and `org(where: {})` for all
  tenants. Separately, `myNotes` (`server/src/schema/resolvers/notes.ts`) looks up
  the **creator's personal org** ignoring the token's org filter, so an org-A
  token reads the creator's personal notes. Contradicts the documented guarantee
  "a token for org A can never reach org B"; now also reachable via MCP.
  (`permissions/index.ts` carries a pre-existing `TODO: scope these to the
  caller's own data` — this is that gap, made load-bearing by the token feature.)

## Medium

- [ ] **4. Client `updateNote`/`deleteNote` silently fail when the note isn't in
  the active cache.** `app/src/context/NotesContext.tsx` (updateNote ~189,
  deleteNote ~197). When `notes.find(n => n.id === id)` misses (stale id,
  deep-link/refresh on a detail view, cross-workspace), the where clause omits
  `orgId` (delete) or falls back to `userId` (update). The server's CASL check is
  org-based and ignores `userId`, so it resolves `{ orgId: undefined }` → throws
  `Forbidden`. Edits (fired on keystroke) and deletes are lost with no surfaced
  error. The `userId` extractor in `permissions/index.ts` `updateNotes` is dead
  code reinforcing the mistaken belief. Fix: ensure the note's `orgId` is always
  known before mutating (or look it up), and surface mutation errors.

- [ ] **5. Any org member can revoke another member's API token.**
  `server/src/schema/resolvers/api-tokens.ts:61` checks only
  `memberships.some(m => m.orgId === token.orgId)`, and CASL grants
  `delete ApiToken` to all `memberOrgIds` (not owner/creator). A low-privilege
  member can `revokeApiToken(id)` to destroy a co-worker's or owner's CI token.
  Fix: restrict revoke (and arguably mint) to the token's creator and/or org
  owners.

- [ ] **6. `provisionUser` find-then-insert race.** `db/src/provision.ts`. Two
  concurrent first-logins for a new email (double-submit) both find no user then
  both insert → `users_email_key` (or `orgs_personal_for_user_id_key` on the
  self-heal path) unique violation → transaction throws an error to the user.
  Fix: `INSERT ... ON CONFLICT DO NOTHING/UPDATE` (upsert) then re-select.

## Low / cleanup

- [ ] **7. `getAbility` does an uncached personal-org query + rebuilds the CASL
  ability per guarded field.** `server/src/middleware/permissions/index.ts:54`.
  `getUserMemberships()` is promise-cached on the context, but the
  `db.query.orgs.findFirst({ where: { personalForUserId } })` here is not, and
  createCan invokes `getAbility` once per guarded root field. A query selecting N
  guarded fields issues N redundant personal-org reads + N ability builds. Fix:
  memoize the personal-org lookup (and/or the built ability) on the context.

- [ ] **8. AGENTS.md curly-brace convention violated in new code.** AGENTS.md:99
  "Always use curly braces for conditionals — no single-line if bodies." Biome
  does not enforce this, so it slipped through. Violations in
  `app/app/(app)/settings.tsx` (copyToClipboard, formatLastUsed, ApiTokensSection
  handlers), `server/src/mcp/tools.ts` (several), `server/src/mcp/index.ts`,
  `server/src/context.ts`. Fix: add braces (or enable biome `useBlockStatements`).

- [ ] **9. `lastUsedAt` write fires on every API-token request, including
  read-only ones.** `server/src/context.ts:69`. Under a token/MCP polling
  workload this is one row UPDATE (and hot-row contention) per request. Fix:
  throttle (only write when `lastUsedAt` is older than N minutes).

- [ ] **10. `DateTime` scalar is generated as `unknown`, forcing per-site casts.**
  e.g. `formatLastUsed(value: unknown)` in settings.tsx and `as string` casts in
  NotesContext. Fix once at the codegen layer: `scalars: { DateTime: 'string' }`
  in `codegen.ts`, instead of a coercion at each call site.
