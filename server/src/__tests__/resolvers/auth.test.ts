import assert from 'node:assert/strict';
import { afterEach, before, beforeEach, describe, it } from 'node:test';
import { magicLinks } from '@cubicecho/notes-db';
import { graphql } from 'graphql';
import { createContext } from '../../context.ts';
import { verifySessionToken } from '../../lib/session.ts';
import { cleanDb, createTestContext } from '../helpers/db.ts';

const REQUEST = `mutation ($email: String!) {
  requestMagicLink(email: $email) { success devLink token user { id email } }
}`;
const VERIFY = `mutation ($token: String!) {
  verifyMagicLink(token: $token) { token user { id } }
}`;

type RequestResult = {
  success: boolean;
  devLink: string | null;
  token: string | null;
  user: { id: string; email: string } | null;
};

describe('auth resolvers', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;
  const savedEnv = { ...process.env };

  before(async () => {
    ctx = await createTestContext();
  });

  beforeEach(async () => {
    await ctx.db.delete(magicLinks);
    await cleanDb(ctx.db);
  });

  afterEach(() => {
    for (const key of ['AUTH_MAGIC_LINK', 'NODE_ENV', 'EXPOSE_MAGIC_LINK']) {
      if (savedEnv[key] === undefined) {
        Reflect.deleteProperty(process.env, key);
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  async function run(source: string, variableValues: Record<string, unknown>) {
    const result = await graphql({
      schema: ctx.schema,
      source,
      variableValues,
      contextValue: await createContext({ db: ctx.db }),
    });
    assert.equal(result.errors, undefined, JSON.stringify(result.errors));
    return result.data as Record<string, unknown>;
  }

  it('verifyMagicLink issues a session JWT, not the user id', async () => {
    Reflect.deleteProperty(process.env, 'AUTH_MAGIC_LINK');
    process.env.NODE_ENV = 'development';
    const requested = (await run(REQUEST, { email: 'a@example.com' }))
      .requestMagicLink as RequestResult;
    assert.equal(requested.token, null);
    const linkToken = new URL(requested.devLink ?? '').searchParams.get(
      'token',
    );

    const verified = (await run(VERIFY, { token: linkToken }))
      .verifyMagicLink as { token: string; user: { id: string } };
    assert.notEqual(verified.token, verified.user.id);
    assert.equal(await verifySessionToken(verified.token), verified.user.id);
  });

  it('with AUTH_MAGIC_LINK=false, signs straight in with a session JWT', async () => {
    process.env.AUTH_MAGIC_LINK = 'false';
    const res = (await run(REQUEST, { email: 'Direct@Example.com' }))
      .requestMagicLink as RequestResult;
    assert.equal(res.devLink, null);
    assert.equal(res.user?.email, 'direct@example.com');
    assert.equal(await verifySessionToken(res.token ?? ''), res.user?.id);

    const session = await createContext({
      db: ctx.db,
      authHeader: `Bearer ${res.token}`,
    });
    assert.equal(session.userId, res.user?.id);
  });
});
