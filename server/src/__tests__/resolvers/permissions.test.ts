import { notes, orgMembers, orgs, users } from '@cubicecho/notes-db';
import { execute, parse } from 'graphql';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, first } from '../helpers/db.ts';

describe('permissions', () => {
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

  describe('users', () => {
    it('denies createUser', async () => {
      const result = await execute({
        schema: ctx.schema,
        document: parse(
          'mutation { createUser(values: { email: "new@example.com" }) { id } }',
        ),
        contextValue: ctx.makeContext(userId1),
      });
      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Forbidden/);
    });

    it('denies createUsers', async () => {
      const result = await execute({
        schema: ctx.schema,
        document: parse(
          'mutation { createUsers(values: [{ email: "new@example.com" }]) { id } }',
        ),
        contextValue: ctx.makeContext(userId1),
      });
      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Forbidden/);
    });

    it('denies deleteUsers regardless of caller', async () => {
      const result = await execute({
        schema: ctx.schema,
        document: parse(`mutation($id: String!) {
          deleteUsers(where: { id: { eq: $id } }) { id }
        }`),
        variableValues: { id: userId1 },
        contextValue: ctx.makeContext(userId1),
      });
      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Forbidden/);
    });

    it('allows updateUsers when caller is updating themselves', async () => {
      const result = await execute({
        schema: ctx.schema,
        document: parse(`mutation($id: String!) {
          updateUsers(set: { email: "alice2@example.com" }, where: { id: { eq: $id } }) { id email }
        }`),
        variableValues: { id: userId1 },
        contextValue: ctx.makeContext(userId1),
      });
      expect(result.errors).toBeUndefined();
    });

    it('denies updateUsers when caller is updating a different user', async () => {
      const result = await execute({
        schema: ctx.schema,
        document: parse(`mutation($id: String!) {
          updateUsers(set: { email: "hacked@example.com" }, where: { id: { eq: $id } }) { id }
        }`),
        variableValues: { id: userId2 },
        contextValue: ctx.makeContext(userId1),
      });
      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Forbidden/);
    });
  });

  describe('orgs', () => {
    let orgId: string;

    beforeEach(async () => {
      orgId = first(
        await ctx.db.insert(orgs).values({ name: 'ACME' }).returning(),
      ).id;
      await ctx.db
        .insert(orgMembers)
        .values({ orgId, userId: userId1, role: 'owner' });
      await ctx.db
        .insert(orgMembers)
        .values({ orgId, userId: userId2, role: 'member' });
    });

    it('allows updateOrgs when caller is the org owner', async () => {
      const result = await execute({
        schema: ctx.schema,
        document: parse(`mutation($id: String!) {
          updateOrgs(set: { name: "Renamed" }, where: { id: { eq: $id } }) { id name }
        }`),
        variableValues: { id: orgId },
        contextValue: ctx.makeContext(userId1),
      });
      expect(result.errors).toBeUndefined();
    });

    it('denies updateOrgs when caller is not the org owner', async () => {
      const result = await execute({
        schema: ctx.schema,
        document: parse(`mutation($id: String!) {
          updateOrgs(set: { name: "Hacked" }, where: { id: { eq: $id } }) { id }
        }`),
        variableValues: { id: orgId },
        contextValue: ctx.makeContext(userId2),
      });
      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Forbidden/);
    });

    it('allows deleteOrgs when caller is the org owner', async () => {
      const result = await execute({
        schema: ctx.schema,
        document: parse(`mutation($id: String!) {
          deleteOrgs(where: { id: { eq: $id } }) { id }
        }`),
        variableValues: { id: orgId },
        contextValue: ctx.makeContext(userId1),
      });
      expect(result.errors).toBeUndefined();
    });

    it('denies deleteOrgs when caller is not the org owner', async () => {
      const result = await execute({
        schema: ctx.schema,
        document: parse(`mutation($id: String!) {
          deleteOrgs(where: { id: { eq: $id } }) { id }
        }`),
        variableValues: { id: orgId },
        contextValue: ctx.makeContext(userId2),
      });
      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Forbidden/);
    });
  });

  describe('orgMembers', () => {
    it('denies createOrgMembers (bulk)', async () => {
      const org = first(
        await ctx.db.insert(orgs).values({ name: 'Team' }).returning(),
      );
      await ctx.db
        .insert(orgMembers)
        .values({ orgId: org.id, userId: userId1, role: 'owner' });

      const result = await execute({
        schema: ctx.schema,
        document: parse(`mutation($orgId: String!, $userId: String!) {
          createOrgMembers(values: [{ orgId: $orgId, userId: $userId }]) { orgId userId }
        }`),
        variableValues: { orgId: org.id, userId: userId2 },
        contextValue: ctx.makeContext(userId1),
      });
      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Forbidden/);
    });
  });

  describe('notes', () => {
    it('denies updateNotes for org notes when caller is not a member', async () => {
      const org = first(
        await ctx.db.insert(orgs).values({ name: 'Org' }).returning(),
      );
      await ctx.db
        .insert(orgMembers)
        .values({ orgId: org.id, userId: userId2, role: 'owner' });
      await ctx.db
        .insert(notes)
        .values({
          userId: userId2,
          orgId: org.id,
          title: 'Secret',
          content: '',
        });

      const result = await execute({
        schema: ctx.schema,
        document: parse(`mutation($orgId: String!) {
          updateNotes(set: { title: "Hacked" }, where: { orgId: { eq: $orgId } }) { id }
        }`),
        variableValues: { orgId: org.id },
        contextValue: ctx.makeContext(userId1),
      });
      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Forbidden/);
    });
  });
});
