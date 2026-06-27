import assert from 'node:assert/strict';
import { before, beforeEach, describe, it } from 'node:test';
import {
  apiTokens,
  orgMembers,
  orgs,
  provisionUser,
} from '@cubicecho/notes-db';
import { eq } from 'drizzle-orm';
import { graphql } from 'graphql';
import { createContext } from '../context.ts';
import { generateApiToken } from '../lib/api-token.ts';
import { cleanDb, createTestContext, first } from './helpers/db.ts';

// Wait (briefly, with retries) for the fire-and-forget lastUsedAt write.
async function poll<T>(fn: () => Promise<T | undefined>): Promise<T> {
  for (let i = 0; i < 20; i++) {
    const value = await fn();
    if (value !== undefined) return value;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error('poll timed out');
}

describe('createContext (dual auth)', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;
  let userId: string;
  let personalOrgId: string;
  let sharedOrgId: string;
  let token: string;

  before(async () => {
    ctx = await createTestContext();
  });

  beforeEach(async () => {
    await cleanDb(ctx.db);

    const provisioned = await provisionUser(ctx.db, {
      email: 'alice@example.com',
    });
    userId = provisioned.user.id;
    personalOrgId = provisioned.personalOrgId;

    sharedOrgId = first(
      await ctx.db.insert(orgs).values({ name: 'Shared' }).returning(),
    ).id;
    await ctx.db
      .insert(orgMembers)
      .values({ orgId: sharedOrgId, userId, role: 'owner' });

    const generated = generateApiToken();
    token = generated.token;
    await ctx.db.insert(apiTokens).values({
      orgId: sharedOrgId,
      createdByUserId: userId,
      name: 'CI',
      tokenPrefix: generated.tokenPrefix,
      tokenHash: generated.tokenHash,
    });
  });

  describe('API token', () => {
    it('resolves the creator as a token actor', async () => {
      const c = await createContext({
        db: ctx.db,
        authHeader: `Bearer ${token}`,
      });
      assert.equal(c.userId, userId);
      assert.equal(c.authKind, 'token');
    });

    it('scopes memberships to ONLY the token org (not personal or other orgs)', async () => {
      const c = await createContext({
        db: ctx.db,
        authHeader: `Bearer ${token}`,
      });
      const memberships = await c.getUserMemberships();
      assert.deepEqual(
        memberships.map((m) => m.orgId),
        [sharedOrgId],
      );
      assert.equal(
        memberships.some((m) => m.orgId === personalOrgId),
        false,
      );
    });

    it('records lastUsedAt', async () => {
      await createContext({ db: ctx.db, authHeader: `Bearer ${token}` });
      const lastUsedAt = await poll(async () => {
        const row = first(
          await ctx.db
            .select()
            .from(apiTokens)
            .where(eq(apiTokens.orgId, sharedOrgId)),
        );
        return row.lastUsedAt ?? undefined;
      });
      assert.ok(lastUsedAt instanceof Date);
    });

    it('treats an unknown/revoked token as unauthenticated', async () => {
      const c = await createContext({
        db: ctx.db,
        authHeader: 'Bearer cet_deadbeefdeadbeef',
      });
      assert.equal(c.userId, undefined);
      assert.equal(c.authKind, 'token');
      assert.deepEqual(await c.getUserMemberships(), []);
    });
  });

  describe('session token', () => {
    it('resolves the user with ALL of their memberships', async () => {
      const c = await createContext({
        db: ctx.db,
        authHeader: `Bearer ${userId}`,
      });
      assert.equal(c.userId, userId);
      assert.equal(c.authKind, 'session');
      const orgIds = (await c.getUserMemberships()).map((m) => m.orgId).sort();
      assert.deepEqual(orgIds, [personalOrgId, sharedOrgId].sort());
    });

    it('falls back to the demo user when no header is present', async () => {
      const c = await createContext({ db: ctx.db, demoUserId: userId });
      assert.equal(c.userId, userId);
      assert.equal(c.authKind, 'session');
    });
  });

  describe('token actor authorization (end to end)', () => {
    it('cannot access another org the creator belongs to', async () => {
      // The creator owns a *second* shared org, but the token is scoped to the
      // first one only.
      const otherOrgId = first(
        await ctx.db.insert(orgs).values({ name: 'Other' }).returning(),
      ).id;
      await ctx.db
        .insert(orgMembers)
        .values({ orgId: otherOrgId, userId, role: 'owner' });

      const tokenCtx = await createContext({
        db: ctx.db,
        authHeader: `Bearer ${token}`,
      });
      const result = await graphql({
        schema: ctx.schema,
        source: `mutation($orgId: String!) {
          createNote(values: { userId: "${userId}", orgId: $orgId, title: "X", content: "" }) { id }
        }`,
        variableValues: { orgId: otherOrgId },
        contextValue: tokenCtx,
      });
      assert.ok(result.errors);
      assert.match(first(result.errors).message, /Forbidden/);
    });

    it('can create a note in its own org', async () => {
      const tokenCtx = await createContext({
        db: ctx.db,
        authHeader: `Bearer ${token}`,
      });
      const result = await graphql({
        schema: ctx.schema,
        source: `mutation($orgId: String!) {
          createNote(values: { userId: "${userId}", orgId: $orgId, title: "X", content: "" }) { id orgId }
        }`,
        variableValues: { orgId: sharedOrgId },
        contextValue: tokenCtx,
      });
      assert.equal(result.errors, undefined);
      const note = result.data?.createNote as { orgId: string };
      assert.equal(note.orgId, sharedOrgId);
    });

    it('cannot mutate the user account', async () => {
      const tokenCtx = await createContext({
        db: ctx.db,
        authHeader: `Bearer ${token}`,
      });
      const result = await graphql({
        schema: ctx.schema,
        source: `mutation($id: String!) {
          updateUsers(set: { email: "hacked@example.com" }, where: { id: { eq: $id } }) { id }
        }`,
        variableValues: { id: userId },
        contextValue: tokenCtx,
      });
      assert.ok(result.errors);
      assert.match(first(result.errors).message, /Forbidden/);
    });

    it('cannot create a new org', async () => {
      const tokenCtx = await createContext({
        db: ctx.db,
        authHeader: `Bearer ${token}`,
      });
      const result = await graphql({
        schema: ctx.schema,
        source:
          'mutation { createOrg(values: { name: "Escapes scope" }) { id } }',
        contextValue: tokenCtx,
      });
      assert.ok(result.errors);
      assert.match(first(result.errors).message, /Forbidden/);
    });
  });
});
