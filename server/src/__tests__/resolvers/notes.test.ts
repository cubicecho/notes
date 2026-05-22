import { notes, orgMembers, orgs, users } from '@cubicecho/notes-db';
import { execute, parse } from 'graphql';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, first } from '../helpers/db.ts';

describe('notes resolvers', () => {
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

  describe('myNotes', () => {
    it('returns notes owned by the authenticated user', async () => {
      await ctx.db.insert(notes).values([
        { userId: userId1, title: 'Alice Note', content: 'hello' },
        { userId: userId2, title: 'Bob Note', content: 'world' },
      ]);

      const result = await execute({
        schema: ctx.schema,
        document: parse('query { myNotes { id title userId } }'),
        contextValue: { db: ctx.db, userId: userId1 },
      });

      expect(result.errors).toBeUndefined();
      const myNotes = result.data?.myNotes as Array<{
        id: string;
        title: string;
        userId: string;
      }>;
      expect(myNotes).toHaveLength(1);
      expect(first(myNotes).title).toBe('Alice Note');
      expect(first(myNotes).userId).toBe(userId1);
    });

    it('does not include org notes owned by others', async () => {
      const org = first(
        await ctx.db.insert(orgs).values({ name: 'Shared Org' }).returning(),
      );
      await ctx.db
        .insert(orgMembers)
        .values({ orgId: org.id, userId: userId1, role: 'member' });
      await ctx.db.insert(notes).values([
        { userId: userId1, title: 'Personal', content: '' },
        { userId: userId2, orgId: org.id, title: 'Org Note', content: '' },
      ]);

      const result = await execute({
        schema: ctx.schema,
        document: parse('query { myNotes { title } }'),
        contextValue: { db: ctx.db, userId: userId1 },
      });

      expect(result.errors).toBeUndefined();
      const myNotes = result.data?.myNotes as Array<{ title: string }>;
      expect(myNotes.map((n) => n.title)).toEqual(['Personal']);
    });

    it('returns error when not authenticated', async () => {
      const result = await execute({
        schema: ctx.schema,
        document: parse('query { myNotes { id } }'),
        contextValue: { db: ctx.db, userId: undefined },
      });

      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Not authenticated/);
    });
  });

  describe('createNote', () => {
    it('creates a personal note owned by the authenticated user', async () => {
      const result = await execute({
        schema: ctx.schema,
        document: parse(
          `mutation { createNote(title: "My Note", content: "hi") { id title content userId orgId } }`,
        ),
        contextValue: { db: ctx.db, userId: userId1 },
      });

      expect(result.errors).toBeUndefined();
      const note = result.data?.createNote as {
        id: string;
        title: string;
        userId: string;
        orgId: string | null;
      };
      expect(note.title).toBe('My Note');
      expect(note.userId).toBe(userId1);
      expect(note.orgId).toBeNull();
    });

    it('creates an org note when orgId is supplied and user is a member', async () => {
      const org = first(
        await ctx.db.insert(orgs).values({ name: 'My Org' }).returning(),
      );
      await ctx.db
        .insert(orgMembers)
        .values({ orgId: org.id, userId: userId1, role: 'owner' });

      const result = await execute({
        schema: ctx.schema,
        document: parse(
          `mutation CreateOrgNote($orgId: String!) { createNote(title: "Org Note", orgId: $orgId) { orgId } }`,
        ),
        variableValues: { orgId: org.id },
        contextValue: { db: ctx.db, userId: userId1 },
      });

      expect(result.errors).toBeUndefined();
      const note = result.data?.createNote as { orgId: string };
      expect(note.orgId).toBe(org.id);
    });

    it('rejects createNote with orgId when user is not a member', async () => {
      const org = first(
        await ctx.db.insert(orgs).values({ name: 'Other Org' }).returning(),
      );
      await ctx.db
        .insert(orgMembers)
        .values({ orgId: org.id, userId: userId2, role: 'owner' });

      const result = await execute({
        schema: ctx.schema,
        document: parse(
          'mutation($orgId: String!) { createNote(orgId: $orgId) { id } }',
        ),
        variableValues: { orgId: org.id },
        contextValue: { db: ctx.db, userId: userId1 },
      });

      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Not a member/);
    });

    it('returns error when not authenticated', async () => {
      const result = await execute({
        schema: ctx.schema,
        document: parse(`mutation { createNote(title: "x") { id } }`),
        contextValue: { db: ctx.db, userId: undefined },
      });

      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Not authenticated/);
    });
  });
});
