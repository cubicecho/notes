import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, describe, it } from 'node:test';
import { type ToolDescriptor, buildTools } from '@cubicecho/graphql-mcp';
import {
  apiTokens,
  orgMembers,
  orgs,
  provisionUser,
} from '@cubicecho/notes-db';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { generateApiToken } from '../../lib/api-token.ts';
import { createMcpHttpHandler } from '../../mcp.ts';
import { cleanDb, createTestContext, first } from '../helpers/db.ts';

function toolNamed(tools: ToolDescriptor[], name: string): ToolDescriptor {
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`No MCP tool named ${name}`);
  }
  return tool;
}

function textOf(result: CallToolResult): string {
  return result.content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map((c) => c.text)
    .join('\n');
}

describe('graphql-mcp', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;
  let tools: ToolDescriptor[];

  before(async () => {
    ctx = await createTestContext();
    tools = buildTools(ctx.schema);
  });

  // Schema → tool-descriptor projection. Pure, no auth.
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

  // Drives the *real* createMcpHttpHandler over HTTP through the MCP client, so
  // the full wiring is exercised: contextFromRequest → createContext (reading the
  // Authorization header), the permission-wrapped schema, and the library's
  // GraphQL-error → tool-`isError` mapping. CASL/auth must apply exactly as on
  // /graphql — a forbidden operation comes back as an `isError` tool result, not
  // a success.
  describe('end-to-end over HTTP (CASL applies identically to /graphql)', () => {
    let baseUrl: URL;
    let closeServer: () => Promise<void>;

    let userId: string;
    let sharedOrgId: string;
    let otherOrgId: string;
    let apiToken: string;

    before(async () => {
      const app = express();
      // Mounted exactly as in src/index.ts (sans cors), against the test db.
      app.use('/mcp', express.json(), createMcpHttpHandler({ db: ctx.db }));
      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const { port } = server.address() as AddressInfo;
      baseUrl = new URL(`http://127.0.0.1:${port}/mcp`);
      closeServer = () =>
        new Promise<void>((resolve) => server.close(() => resolve()));
    });

    after(async () => {
      await closeServer();
    });

    // Connects a fresh MCP client (optionally bearer-authenticated), calls one
    // tool, and tears the connection down.
    async function callTool(
      token: string | undefined,
      name: string,
      args: Record<string, unknown>,
    ): Promise<CallToolResult> {
      const transport = new StreamableHTTPClientTransport(
        baseUrl,
        token
          ? { requestInit: { headers: { Authorization: `Bearer ${token}` } } }
          : undefined,
      );
      const client = new Client({ name: 'mcp-test', version: '0' });
      await client.connect(transport);
      try {
        return (await client.callTool({
          name,
          arguments: args,
        })) as CallToolResult;
      } finally {
        await client.close();
      }
    }

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

    const createNoteArgs = (orgId: string) => ({
      values: { userId, orgId, title: 'X', content: '' },
    });

    it('returns an isError tool result for an unauthenticated caller', async () => {
      const result = await callTool(
        undefined,
        'createNote',
        createNoteArgs(sharedOrgId),
      );
      assert.equal(result.isError, true);
      assert.match(textOf(result), /Not authenticated/);
    });

    it('lets a session actor create a note in their org', async () => {
      const result = await callTool(
        userId,
        'createNote',
        createNoteArgs(sharedOrgId),
      );
      assert.notEqual(result.isError, true);
      // The auto-generated selection set round-trips the note's orgId.
      assert.match(textOf(result), new RegExp(`"orgId":\\s*"${sharedOrgId}"`));
    });

    it('confines an API-token actor to its own org', async () => {
      // Own org → allowed.
      const ok = await callTool(
        apiToken,
        'createNote',
        createNoteArgs(sharedOrgId),
      );
      assert.notEqual(ok.isError, true);

      // A different org the *creator* belongs to → still forbidden via the token.
      const denied = await callTool(
        apiToken,
        'createNote',
        createNoteArgs(otherOrgId),
      );
      assert.equal(denied.isError, true);
      assert.match(textOf(denied), /Forbidden/);
    });

    it('forbids an API-token actor from creating a new org', async () => {
      const result = await callTool(apiToken, 'createOrg', {
        values: { name: 'Escapes scope' },
      });
      assert.equal(result.isError, true);
      assert.match(textOf(result), /Forbidden/);
    });

    it('runs a query tool for an authorized actor', async () => {
      const result = await callTool(userId, 'myOrgs', {});
      assert.notEqual(result.isError, true);
      assert.match(textOf(result), /Shared/);
    });
  });
});
