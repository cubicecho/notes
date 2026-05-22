import assert from 'node:assert/strict';
import { before, beforeEach, describe, it } from 'node:test';
import { orgMembers, orgs, users } from '@cubicecho/notes-db';
import { graphql } from 'graphql';
import { cleanDb, createTestContext, first } from '../helpers/db.ts';

describe('orgs resolvers', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;
  let userId1: string;
  let userId2: string;

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
  });

  describe('createOrg', () => {
    it('creates an org and adds caller as owner', async () => {
      const result = await graphql({
        schema: ctx.schema,
        source: 'mutation { createOrg(values: { name: "ACME" }) { id name } }',
        contextValue: ctx.makeContext(userId1),
      });

      assert.equal(result.errors, undefined);
      const org = result.data?.createOrg as { id: string; name: string };
      assert.equal(org.name, 'ACME');

      const membership = await ctx.db.query.orgMembers.findFirst({
        where: { orgId: org.id, userId: userId1 },
      });
      assert.equal(membership?.role, 'owner');
    });

    it('returns error when not authenticated', async () => {
      const result = await graphql({
        schema: ctx.schema,
        source: 'mutation { createOrg(values: { name: "X" }) { id } }',
        contextValue: ctx.makeContext(),
      });

      assert.ok(result.errors);
      assert.match(first(result.errors).message, /Not authenticated/);
    });
  });

  describe('myOrgs', () => {
    it('returns orgs the user belongs to', async () => {
      const org1 = first(
        await ctx.db.insert(orgs).values({ name: 'Org A' }).returning(),
      );
      const org2 = first(
        await ctx.db.insert(orgs).values({ name: 'Org B' }).returning(),
      );
      await ctx.db.insert(orgs).values({ name: 'Org C' });

      await ctx.db.insert(orgMembers).values([
        { orgId: org1.id, userId: userId1, role: 'owner' },
        { orgId: org2.id, userId: userId1, role: 'member' },
        { orgId: org2.id, userId: userId2, role: 'owner' },
      ]);

      const result = await graphql({
        schema: ctx.schema,
        source: 'query { myOrgs { id name } }',
        contextValue: ctx.makeContext(userId1),
      });

      assert.equal(result.errors, undefined);
      const myOrgs = result.data?.myOrgs as Array<{ name: string }>;
      assert.deepEqual(myOrgs.map((o) => o.name).sort(), ['Org A', 'Org B']);
    });

    it('returns error when not authenticated', async () => {
      const result = await graphql({
        schema: ctx.schema,
        source: 'query { myOrgs { id } }',
        contextValue: ctx.makeContext(),
      });

      assert.ok(result.errors);
      assert.match(first(result.errors).message, /Not authenticated/);
    });
  });

  describe('createOrgMember', () => {
    it('adds a member when caller is the org owner', async () => {
      const org = first(
        await ctx.db.insert(orgs).values({ name: 'Team' }).returning(),
      );
      await ctx.db
        .insert(orgMembers)
        .values({ orgId: org.id, userId: userId1, role: 'owner' });

      const result = await graphql({
        schema: ctx.schema,
        source: `mutation($orgId: String!, $userId: String!) {
          createOrgMember(values: { orgId: $orgId, userId: $userId, role: member }) { orgId userId role }
        }`,
        variableValues: { orgId: org.id, userId: userId2 },
        contextValue: ctx.makeContext(userId1),
      });

      assert.equal(result.errors, undefined);
      const membership = result.data?.createOrgMember as {
        orgId: string;
        userId: string;
        role: string;
      };
      assert.equal(membership.userId, userId2);
      assert.equal(membership.role, 'member');
    });

    it('rejects when caller is not an owner', async () => {
      const org = first(
        await ctx.db.insert(orgs).values({ name: 'Team' }).returning(),
      );
      await ctx.db
        .insert(orgMembers)
        .values({ orgId: org.id, userId: userId1, role: 'member' });

      const result = await graphql({
        schema: ctx.schema,
        source: `mutation($orgId: String!, $userId: String!) {
          createOrgMember(values: { orgId: $orgId, userId: $userId, role: member }) { orgId }
        }`,
        variableValues: { orgId: org.id, userId: userId2 },
        contextValue: ctx.makeContext(userId1),
      });

      assert.ok(result.errors);
      assert.match(first(result.errors).message, /Forbidden/);
    });

    it('rejects when caller is not a member at all', async () => {
      const org = first(
        await ctx.db.insert(orgs).values({ name: 'Team' }).returning(),
      );
      await ctx.db
        .insert(orgMembers)
        .values({ orgId: org.id, userId: userId2, role: 'owner' });

      const result = await graphql({
        schema: ctx.schema,
        source: `mutation($orgId: String!, $userId: String!) {
          createOrgMember(values: { orgId: $orgId, userId: $userId, role: member }) { orgId }
        }`,
        variableValues: { orgId: org.id, userId: userId2 },
        contextValue: ctx.makeContext(userId1),
      });

      assert.ok(result.errors);
      assert.match(first(result.errors).message, /Forbidden/);
    });
  });

  describe('deleteOrgMembers', () => {
    it('removes a member when caller is the org owner', async () => {
      const org = first(
        await ctx.db.insert(orgs).values({ name: 'Squad' }).returning(),
      );
      await ctx.db.insert(orgMembers).values([
        { orgId: org.id, userId: userId1, role: 'owner' },
        { orgId: org.id, userId: userId2, role: 'member' },
      ]);

      const result = await graphql({
        schema: ctx.schema,
        source: `mutation($orgId: String!, $userId: String!) {
          deleteOrgMembers(where: { orgId: { eq: $orgId }, userId: { eq: $userId } }) { orgId userId }
        }`,
        variableValues: { orgId: org.id, userId: userId2 },
        contextValue: ctx.makeContext(userId1),
      });

      assert.equal(result.errors, undefined);
      const removed = result.data?.deleteOrgMembers as Array<{
        userId: string;
      }>;
      assert.equal(first(removed).userId, userId2);

      const stillMember = await ctx.db.query.orgMembers.findFirst({
        where: { orgId: org.id, userId: userId2 },
      });
      assert.equal(stillMember, undefined);
    });

    it('rejects when caller is not an owner', async () => {
      const org = first(
        await ctx.db.insert(orgs).values({ name: 'Squad' }).returning(),
      );
      await ctx.db
        .insert(orgMembers)
        .values({ orgId: org.id, userId: userId1, role: 'member' });

      const result = await graphql({
        schema: ctx.schema,
        source: `mutation($orgId: String!, $userId: String!) {
          deleteOrgMembers(where: { orgId: { eq: $orgId }, userId: { eq: $userId } }) { orgId }
        }`,
        variableValues: { orgId: org.id, userId: userId2 },
        contextValue: ctx.makeContext(userId1),
      });

      assert.ok(result.errors);
      assert.match(first(result.errors).message, /Forbidden/);
    });
  });
});
