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
        contextValue: ctx.makeContext(userId1),
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
        contextValue: ctx.makeContext(userId1),
      });

      expect(result.errors).toBeUndefined();
      const myNotes = result.data?.myNotes as Array<{ title: string }>;
      expect(myNotes.map((n) => n.title)).toEqual(['Personal']);
    });

    it('returns error when not authenticated', async () => {
      const result = await execute({
        schema: ctx.schema,
        document: parse('query { myNotes { id } }'),
        contextValue: ctx.makeContext(),
      });

      expect(result.errors).toBeDefined();
      expect(first(result.errors ?? []).message).toMatch(/Not authenticated/);
    });
  });
});
