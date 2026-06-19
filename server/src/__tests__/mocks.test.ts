import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInMemoryDb } from '@cubicecho/notes-db';
import { buildBaseSchema } from '../schema/base.ts';
import { buildSchemaMocks } from './helpers/mocks.ts';

describe('schema mocks', () => {
  it('produces typed pools keyed by SchemaTypeMap', async () => {
    const db = await createInMemoryDb();
    const mocks = buildSchemaMocks(buildBaseSchema(db));

    // Default count is 5 per object type.
    assert.equal(mocks.User.length, 5);
    assert.equal(mocks.Note.length, 5);

    const user = mocks.User[0];
    assert.ok(user);
    // Pool is typed as User[] via SchemaTypeMap — fields are statically known.
    assert.equal(user.__typename, 'User');
    assert.equal(typeof user.email, 'string');
    // stableIds gives readable, collision-free ids.
    assert.equal(user.id, 'User-0');
    // The DateTime scalar mocker yields a string (the scalar's TS type is unknown).
    assert.equal(typeof user.createdAt, 'string');
  });

  it('is deterministic under the seeded defaults', async () => {
    const db = await createInMemoryDb();
    const a = buildSchemaMocks(buildBaseSchema(db));
    const b = buildSchemaMocks(buildBaseSchema(db));

    const [userA] = a.User;
    const [userB] = b.User;
    assert.ok(userA && userB);
    assert.equal(userA.email, userB.email);
  });
});
