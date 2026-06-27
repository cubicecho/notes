import assert from 'node:assert/strict';
import { before, beforeEach, describe, it } from 'node:test';
import { apiTokens, orgMembers, orgs, users } from '@cubicecho/notes-db';
import { eq } from 'drizzle-orm';
import { graphql } from 'graphql';
import { API_TOKEN_PREFIX, hashApiToken } from '../../lib/api-token.ts';
import { cleanDb, createTestContext, first } from '../helpers/db.ts';

describe('api token resolvers', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;
  let userId1: string;
  let userId2: string;
  let orgId: string;

  before(async () => {
    ctx = await createTestContext();
  });

  beforeEach(async () => {
    await cleanDb(ctx.db);

    userId1 = first(
      await ctx.db
        .insert(users)
        .values({ email: 'alice@example.com' })
        .returning(),
    ).id;
    userId2 = first(
      await ctx.db
        .insert(users)
        .values({ email: 'bob@example.com' })
        .returning(),
    ).id;
    orgId = first(
      await ctx.db.insert(orgs).values({ name: 'ACME' }).returning(),
    ).id;
    await ctx.db
      .insert(orgMembers)
      .values({ orgId, userId: userId1, role: 'owner' });
  });

  describe('createApiToken', () => {
    it('mints a token, returns the plaintext once, and stores only its hash', async () => {
      const result = await graphql({
        schema: ctx.schema,
        source: `mutation($orgId: String!) {
          createApiToken(orgId: $orgId, name: "CI") {
            token
            apiToken { id orgId name tokenPrefix createdByUserId }
          }
        }`,
        variableValues: { orgId },
        contextValue: ctx.makeContext(userId1),
      });

      assert.equal(result.errors, undefined);
      const data = result.data?.createApiToken as {
        token: string;
        apiToken: {
          id: string;
          orgId: string;
          name: string;
          tokenPrefix: string;
          createdByUserId: string;
        };
      };

      assert.ok(data.token.startsWith(API_TOKEN_PREFIX));
      assert.equal(data.apiToken.orgId, orgId);
      assert.equal(data.apiToken.name, 'CI');
      assert.equal(data.apiToken.createdByUserId, userId1);
      assert.ok(data.token.startsWith(data.apiToken.tokenPrefix));

      // Only the hash is persisted — never the plaintext.
      const row = first(
        await ctx.db
          .select()
          .from(apiTokens)
          .where(eq(apiTokens.id, data.apiToken.id)),
      );
      assert.equal(row.tokenHash, hashApiToken(data.token));
      assert.notEqual(row.tokenHash, data.token);
    });

    it('denies creating a token for an org the caller is not a member of', async () => {
      const result = await graphql({
        schema: ctx.schema,
        source: `mutation($orgId: String!) {
          createApiToken(orgId: $orgId, name: "Sneaky") { token }
        }`,
        variableValues: { orgId },
        contextValue: ctx.makeContext(userId2),
      });

      assert.ok(result.errors);
      assert.match(first(result.errors).message, /Forbidden/);
    });

    it('requires authentication', async () => {
      const result = await graphql({
        schema: ctx.schema,
        source: `mutation($orgId: String!) {
          createApiToken(orgId: $orgId, name: "X") { token }
        }`,
        variableValues: { orgId },
        contextValue: ctx.makeContext(),
      });

      assert.ok(result.errors);
      assert.match(first(result.errors).message, /Not authenticated/);
    });
  });

  describe('apiTokens query', () => {
    it('lists tokens for a member org without leaking the hash', async () => {
      await ctx.db.insert(apiTokens).values({
        orgId,
        createdByUserId: userId1,
        name: 'Deploy',
        tokenPrefix: 'cet_aaaa1111',
        tokenHash: hashApiToken('cet_secret'),
      });

      const result = await graphql({
        schema: ctx.schema,
        source: `query($orgId: String!) {
          apiTokens(orgId: $orgId) { id name tokenPrefix }
        }`,
        variableValues: { orgId },
        contextValue: ctx.makeContext(userId1),
      });

      assert.equal(result.errors, undefined);
      const tokens = result.data?.apiTokens as Array<{
        id: string;
        name: string;
        tokenPrefix: string;
      }>;
      assert.equal(tokens.length, 1);
      assert.equal(first(tokens).name, 'Deploy');
      // The GraphQL type has no tokenHash field at all.
      assert.equal('tokenHash' in first(tokens), false);
    });

    it('denies listing tokens for a non-member org', async () => {
      const result = await graphql({
        schema: ctx.schema,
        source: `query($orgId: String!) {
          apiTokens(orgId: $orgId) { id }
        }`,
        variableValues: { orgId },
        contextValue: ctx.makeContext(userId2),
      });

      assert.ok(result.errors);
      assert.match(first(result.errors).message, /Forbidden/);
    });
  });

  describe('revokeApiToken', () => {
    let tokenId: string;

    beforeEach(async () => {
      tokenId = first(
        await ctx.db
          .insert(apiTokens)
          .values({
            orgId,
            createdByUserId: userId1,
            name: 'Revoke me',
            tokenPrefix: 'cet_bbbb2222',
            tokenHash: hashApiToken('cet_revoke'),
          })
          .returning(),
      ).id;
    });

    it('deletes the token when the caller is a member of its org', async () => {
      const result = await graphql({
        schema: ctx.schema,
        source: `mutation($id: String!) { revokeApiToken(id: $id) }`,
        variableValues: { id: tokenId },
        contextValue: ctx.makeContext(userId1),
      });

      assert.equal(result.errors, undefined);
      assert.equal(result.data?.revokeApiToken, true);

      const remaining = await ctx.db
        .select()
        .from(apiTokens)
        .where(eq(apiTokens.id, tokenId));
      assert.equal(remaining.length, 0);
    });

    it('denies revoking a token in an org the caller is not a member of', async () => {
      const result = await graphql({
        schema: ctx.schema,
        source: `mutation($id: String!) { revokeApiToken(id: $id) }`,
        variableValues: { id: tokenId },
        contextValue: ctx.makeContext(userId2),
      });

      assert.ok(result.errors);
      assert.match(first(result.errors).message, /Forbidden/);

      // Still present — the denied call must not delete.
      const remaining = await ctx.db
        .select()
        .from(apiTokens)
        .where(eq(apiTokens.id, tokenId));
      assert.equal(remaining.length, 1);
    });
  });
});
