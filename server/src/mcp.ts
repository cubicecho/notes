/**
 * Wiring for the GraphQL-as-MCP endpoint.
 *
 * The handler this returns serves every GraphQL root field as an MCP tool via
 * @cubicecho/graphql-mcp. Two things make it safe by construction:
 *
 * - It builds the *permission-wrapped* schema (`buildAppSchema`) itself, so the
 *   unwrapped (CASL-free) schema can never be exposed over MCP by a miswiring.
 * - It derives per-request GraphQL context from the same `createContext` as
 *   `/graphql`, so dual auth (user session or org-scoped API token) and every
 *   CASL rule apply to MCP tool calls identically — an MCP caller can do exactly
 *   what it could over `/graphql`, no more.
 */

import { type McpHttpHandler, createHttpHandler } from '@cubicecho/graphql-mcp';
import type { DB } from '@cubicecho/notes-db';
import { createContext } from './context.ts';
import { buildAppSchema } from './schema/index.ts';

/**
 * Builds the Express/Node request handler for the `/mcp` endpoint. Tool
 * descriptors are built once; each request gets a fresh server and a context
 * derived from its `Authorization` header.
 */
export function createMcpHttpHandler(opts: {
  db: DB;
  demoUserId?: string;
}): McpHttpHandler {
  return createHttpHandler({
    schema: buildAppSchema(opts.db),
    contextFromRequest: (req) =>
      createContext({
        db: opts.db,
        authHeader: req.headers.authorization,
        demoUserId: opts.demoUserId,
      }),
  });
}
