import assert from 'node:assert/strict';
import { before, beforeEach, describe, it } from 'node:test';
import { notes, orgMembers, orgs, users } from '@cubicecho/notes-db';
import { graphql } from 'graphql';
import { cleanDb, createTestContext, first } from '../helpers/db.ts';

describe('notes resolvers', () => {
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

  describe('myNotes', () => {
    it('returns notes owned by the authenticated user', async () => {
      await ctx.db.insert(notes).values([
        { userId: userId1, title: 'Alice Note', content: 'hello' },
        { userId: userId2, title: 'Bob Note', content: 'world' },
      ]);

      const result = await graphql({
        schema: ctx.schema,
        source: 'query { myNotes { id title userId } }',
        contextValue: ctx.makeContext(userId1),
      });

      assert.equal(result.errors, undefined);
      const myNotes = result.data?.myNotes as Array<{
        id: string;
        title: string;
        userId: string;
      }>;
      assert.equal(myNotes.length, 1);
      assert.equal(first(myNotes).title, 'Alice Note');
      assert.equal(first(myNotes).userId, userId1);
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

      const result = await graphql({
        schema: ctx.schema,
        source: 'query { myNotes { title } }',
        contextValue: ctx.makeContext(userId1),
      });

      assert.equal(result.errors, undefined);
      const myNotes = result.data?.myNotes as Array<{ title: string }>;
      assert.deepEqual(
        myNotes.map((n) => n.title),
        ['Personal'],
      );
    });

    it('returns error when not authenticated', async () => {
      const result = await graphql({
        schema: ctx.schema,
        source: 'query { myNotes { id } }',
        contextValue: ctx.makeContext(),
      });

      assert.ok(result.errors);
      assert.match(first(result.errors).message, /Not authenticated/);
    });
  });
});
