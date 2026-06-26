import assert from 'node:assert/strict';
import { before, beforeEach, describe, it } from 'node:test';
import {
  type GraphqlResult,
  type ToolDescriptor,
  buildTools,
  createLocalExecutor,
} from '@cubicecho/graphql-mcp';
import {
  apiTokens,
  orgMembers,
  orgs,
  provisionUser,
} from '@cubicecho/notes-db';
import type { GraphQLSchema } from 'graphql';
import { type Context, createContext } from '../../context.ts';
import { generateApiToken } from '../../lib/api-token.ts';
import { cleanDb, createTestContext, first } from '../helpers/db.ts';

function toolNamed(tools: ToolDescriptor[], name: string): ToolDescriptor {
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`No MCP tool named ${name}`);
  return tool;
}

/**
 * Runs a tool descriptor exactly as the MCP server does: through the library's
 * local executor against the permission-wrapped schema, with the caller's
 * {@link Context} as the GraphQL `contextValue`. This is the same path
 * `createHttpHandler` takes, so CASL/auth is exercised identically to /graphql.
 */
function runTool(
  schema: GraphQLSchema,
  tool: ToolDescriptor,
  variables: Record<string, unknown>,
  context: Context,
): Promise<GraphqlResult> {
  const executor = createLocalExecutor(schema);
  return executor({
    query: tool.query,
    variables,
    operationName: tool.name,
    context,
  });
}

function errorText(result: GraphqlResult): string {
  return (result.errors ?? []).map((e) => e.message).join('\n');
}

describe('graphql-mcp', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;
  let tools: ToolDescriptor[];

  before(async () => {
    ctx = await createTestContext();
    tools = buildTools(ctx.schema);
  });

  describe('buildTools', () => {
    it('exposes both query and mutation root fields as tools', () => {
      const names = new Set(tools.map((t) => t.name));
      // Queries
      assert.ok(names.has('myOrgs'));
      assert.ok(names.has('apiTokens'));
      // Mutations
      assert.ok(names.has('createNote'));
      assert.ok(names.has('createApiToken'));
    });

    it('annotates queries read-only and mutations destructive', () => {
      assert.equal(toolNamed(tools, 'myOrgs').annotations.readOnlyHint, true);
      assert.equal(
        toolNamed(tools, 'createNote').annotations.destructiveHint,
        true,
      );
    });

    it('derives the input schema from field arguments', () => {
      const createNote = toolNamed(tools, 'createNote');
      assert.ok(createNote.inputSchema.values, 'has a values argument');
      // A required (non-null) arg is not optional.
      assert.equal(createNote.inputSchema.values.isOptional(), false);

      const myOrgs = toolNamed(tools, 'myOrgs');
      assert.deepEqual(Object.keys(myOrgs.inputSchema), []);
    });

    it('auto-generates a selection set for object return types', () => {
      const op = toolNamed(tools, 'myOrgs').query;
      assert.match(op, /query myOrgs/);
      assert.match(op, /\bid\b/);
      assert.match(op, /\bname\b/);
      assert.match(op, /__typename/);
    });
  });

  describe('auth enforcement (CASL applies identically to /graphql)', () => {
    let userId: string;
    let sharedOrgId: string;
    let otherOrgId: string;
    let apiToken: string;

    beforeEach(async () => {
      await cleanDb(ctx.db);

      const provisioned = await provisionUser(ctx.db, {
        email: 'alice@example.com',
      });
      userId = provisioned.user.id;

      sharedOrgId = first(
        await ctx.db.insert(orgs).values({ name: 'Shared' }).returning(),
      ).id;
      await ctx.db
        .insert(orgMembers)
        .values({ orgId: sharedOrgId, userId, role: 'owner' });

      // A second org the user belongs to, but the API token will NOT be scoped to.
      otherOrgId = first(
        await ctx.db.insert(orgs).values({ name: 'Other' }).returning(),
      ).id;
      await ctx.db
        .insert(orgMembers)
        .values({ orgId: otherOrgId, userId, role: 'owner' });

      const generated = generateApiToken();
      apiToken = generated.token;
      await ctx.db.insert(apiTokens).values({
        orgId: sharedOrgId,
        createdByUserId: userId,
        name: 'CI',
        tokenPrefix: generated.tokenPrefix,
        tokenHash: generated.tokenHash,
      });
    });

    const createNoteVars = (orgId: string) => ({
      values: { userId, orgId, title: 'X', content: '' },
    });

    it('rejects an unauthenticated caller', async () => {
      const c = await createContext({ db: ctx.db });
      const result = await runTool(
        ctx.schema,
        toolNamed(tools, 'createNote'),
        createNoteVars(sharedOrgId),
        c,
      );
      assert.match(errorText(result), /Not authenticated/);
    });

    it('lets a session actor create a note in their org', async () => {
      const c = await createContext({
        db: ctx.db,
        authHeader: `Bearer ${userId}`,
      });
      const result = await runTool(
        ctx.schema,
        toolNamed(tools, 'createNote'),
        createNoteVars(sharedOrgId),
        c,
      );
      assert.deepEqual(result.errors ?? [], []);
      assert.ok(result.data?.createNote);
    });

    it('confines an API-token actor to its own org', async () => {
      const c = await createContext({
        db: ctx.db,
        authHeader: `Bearer ${apiToken}`,
      });

      // Own org → allowed.
      const ok = await runTool(
        ctx.schema,
        toolNamed(tools, 'createNote'),
        createNoteVars(sharedOrgId),
        c,
      );
      assert.deepEqual(ok.errors ?? [], []);

      // A different org the *creator* belongs to → still forbidden via the token.
      const denied = await runTool(
        ctx.schema,
        toolNamed(tools, 'createNote'),
        createNoteVars(otherOrgId),
        c,
      );
      assert.match(errorText(denied), /Forbidden/);
    });

    it('forbids an API-token actor from creating a new org', async () => {
      const c = await createContext({
        db: ctx.db,
        authHeader: `Bearer ${apiToken}`,
      });
      const result = await runTool(
        ctx.schema,
        toolNamed(tools, 'createOrg'),
        { values: { name: 'Escapes scope' } },
        c,
      );
      assert.match(errorText(result), /Forbidden/);
    });

    it('runs a query tool for an authorized actor', async () => {
      const c = await createContext({
        db: ctx.db,
        authHeader: `Bearer ${userId}`,
      });
      const result = await runTool(
        ctx.schema,
        toolNamed(tools, 'myOrgs'),
        {},
        c,
      );
      assert.deepEqual(result.errors ?? [], []);
      assert.match(JSON.stringify(result.data), /Shared/);
    });
  });
});
