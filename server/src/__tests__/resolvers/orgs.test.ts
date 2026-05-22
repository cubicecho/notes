import { orgMembers, orgs, users } from '@cubicecho/notes-db';
import { execute, parse } from 'graphql';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, first } from '../helpers/db.ts';

describe('orgs resolvers', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;
  let userId1: string;
  let userId2: string;

  beforeEach(async () => {
    ctx = await createTestContext();

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
      const result = await execute({
        schema: ctx.schema,
        document: parse(
          'mutation { createOrg(values: { name: "ACME" }) { id name } }',
        ),
        contextValue: ctx.makeContext(userId1),
      });

      expect(result.errors).toBeUndefined();
      const org = result.data?.createOrg as { id: string; name: string };
      expect(org.name).toBe('ACME');

      const membership = await ctx.db.query.orgMembers.findFirst({
        where: { orgId: org.id, userId: userId1 },
      });
      expect(membership?.role).toBe('owner');
    });

    it('returns error when not authenticated', async () => {
      const result = await execute({
        schema: ctx.schema,
        document: parse('mutation { createOrg(values: { name: "X" }) { id } }'),
        contextValue: ctx.makeContext(),
      });

      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Not authenticated/);
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
      await ctx.db.insert(orgs).values({ name: 'Org C' }); // user1 is NOT in this one

      await ctx.db.insert(orgMembers).values([
        { orgId: org1.id, userId: userId1, role: 'owner' },
        { orgId: org2.id, userId: userId1, role: 'member' },
        { orgId: org2.id, userId: userId2, role: 'owner' },
      ]);

      const result = await execute({
        schema: ctx.schema,
        document: parse('query { myOrgs { id name } }'),
        contextValue: ctx.makeContext(userId1),
      });

      expect(result.errors).toBeUndefined();
      const myOrgs = result.data?.myOrgs as Array<{ name: string }>;
      const names = myOrgs.map((o) => o.name).sort();
      expect(names).toEqual(['Org A', 'Org B']);
    });

    it('returns error when not authenticated', async () => {
      const result = await execute({
        schema: ctx.schema,
        document: parse('query { myOrgs { id } }'),
        contextValue: ctx.makeContext(),
      });

      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Not authenticated/);
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

      const result = await execute({
        schema: ctx.schema,
        document: parse(`mutation($orgId: String!, $userId: String!) {
          createOrgMember(values: { orgId: $orgId, userId: $userId, role: member }) { orgId userId role }
        }`),
        variableValues: { orgId: org.id, userId: userId2 },
        contextValue: ctx.makeContext(userId1),
      });

      expect(result.errors).toBeUndefined();
      const membership = result.data?.createOrgMember as {
        orgId: string;
        userId: string;
        role: string;
      };
      expect(membership.userId).toBe(userId2);
      expect(membership.role).toBe('member');
    });

    it('rejects when caller is not an owner', async () => {
      const org = first(
        await ctx.db.insert(orgs).values({ name: 'Team' }).returning(),
      );
      await ctx.db
        .insert(orgMembers)
        .values({ orgId: org.id, userId: userId1, role: 'member' });

      const result = await execute({
        schema: ctx.schema,
        document: parse(`mutation($orgId: String!, $userId: String!) {
          createOrgMember(values: { orgId: $orgId, userId: $userId, role: member }) { orgId }
        }`),
        variableValues: { orgId: org.id, userId: userId2 },
        contextValue: ctx.makeContext(userId1),
      });

      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Forbidden/);
    });

    it('rejects when caller is not a member at all', async () => {
      const org = first(
        await ctx.db.insert(orgs).values({ name: 'Team' }).returning(),
      );
      await ctx.db
        .insert(orgMembers)
        .values({ orgId: org.id, userId: userId2, role: 'owner' });

      const result = await execute({
        schema: ctx.schema,
        document: parse(`mutation($orgId: String!, $userId: String!) {
          createOrgMember(values: { orgId: $orgId, userId: $userId, role: member }) { orgId }
        }`),
        variableValues: { orgId: org.id, userId: userId2 },
        contextValue: ctx.makeContext(userId1),
      });

      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Forbidden/);
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

      const result = await execute({
        schema: ctx.schema,
        document: parse(`mutation($orgId: String!, $userId: String!) {
          deleteOrgMembers(where: { orgId: { eq: $orgId }, userId: { eq: $userId } }) { orgId userId }
        }`),
        variableValues: { orgId: org.id, userId: userId2 },
        contextValue: ctx.makeContext(userId1),
      });

      expect(result.errors).toBeUndefined();
      const removed = result.data?.deleteOrgMembers as Array<{
        userId: string;
      }>;
      expect(first(removed).userId).toBe(userId2);

      const stillMember = await ctx.db.query.orgMembers.findFirst({
        where: { orgId: org.id, userId: userId2 },
      });
      expect(stillMember).toBeUndefined();
    });

    it('rejects when caller is not an owner', async () => {
      const org = first(
        await ctx.db.insert(orgs).values({ name: 'Squad' }).returning(),
      );
      await ctx.db
        .insert(orgMembers)
        .values({ orgId: org.id, userId: userId1, role: 'member' });

      const result = await execute({
        schema: ctx.schema,
        document: parse(`mutation($orgId: String!, $userId: String!) {
          deleteOrgMembers(where: { orgId: { eq: $orgId }, userId: { eq: $userId } }) { orgId }
        }`),
        variableValues: { orgId: org.id, userId: userId2 },
        contextValue: ctx.makeContext(userId1),
      });

      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Forbidden/);
    });
  });
});
