/**
 * GraphQL-as-MCP: serve the GraphQL API over the Model Context Protocol so an AI
 * can discover and call each query/mutation as a tool.
 *
 * **Auth is not re-implemented here.** Tools execute against the very same
 * permission-wrapped schema the `/graphql` endpoint uses (`buildAppSchema`,
 * which applies the CASL middleware), with a {@link Context} built by the same
 * {@link createContext} from the request's `Authorization` header. Dual auth
 * (user session *or* org-scoped API token) and every CASL rule therefore apply
 * identically — an MCP caller can do exactly what it could do over `/graphql`,
 * no more.
 */

import type { DB } from '@cubicecho/notes-db';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { type GraphQLSchema, graphql } from 'graphql';
import { type Context, createContext } from '../context.ts';
import { type GraphqlTool, buildGraphqlTools } from './tools.ts';

export { buildGraphqlTools };
export type { GraphqlTool };

export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
  // The SDK's CallToolResult carries an open index signature; mirror it so this
  // type is assignable to a tool callback's return.
  [key: string]: unknown;
}

/**
 * Runs a tool's GraphQL operation against the (permission-wrapped) schema with
 * the caller's context. CASL denials surface as GraphQL errors here, reported to
 * the AI as an `isError` tool result rather than throwing.
 */
export async function executeTool(
  schema: GraphQLSchema,
  tool: GraphqlTool,
  variableValues: Record<string, unknown>,
  contextValue: Context,
): Promise<McpToolResult> {
  const result = await graphql({
    schema,
    source: tool.operation,
    variableValues,
    contextValue,
  });

  const errors = result.errors ?? [];
  if (errors.length > 0) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              errors: errors.map((e) => ({ message: e.message, path: e.path })),
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      { type: 'text', text: JSON.stringify(result.data ?? null, null, 2) },
    ],
  };
}

/**
 * Builds an {@link McpServer} exposing every root field as a tool, each bound to
 * the supplied per-request {@link Context}. A fresh server is created per request
 * so the context (and thus the actor) never leaks between callers.
 */
export function createMcpServer(args: {
  schema: GraphQLSchema;
  contextValue: Context;
  tools?: GraphqlTool[];
}): McpServer {
  const tools = args.tools ?? buildGraphqlTools(args.schema);
  const server = new McpServer({ name: 'cubicecho-notes', version: '0.1.0' });

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      },
      (input: Record<string, unknown> | undefined) =>
        executeTool(args.schema, tool, input ?? {}, args.contextValue),
    );
  }

  return server;
}

/**
 * Express handler serving the tools over the MCP Streamable HTTP transport in
 * stateless mode (a fresh server + transport per request). Mount it beside the
 * GraphQL handler:
 *
 *   app.use('/mcp', express.json(), createMcpHandler({ schema, db }));
 */
export function createMcpHandler(opts: {
  schema: GraphQLSchema;
  db: DB;
  demoUserId?: string;
}) {
  // Tool descriptors are schema-derived and request-independent — build once.
  const tools = buildGraphqlTools(opts.schema);

  return async (req: Request, res: Response): Promise<void> => {
    const contextValue = await createContext({
      db: opts.db,
      authHeader: req.headers.authorization,
      demoUserId: opts.demoUserId,
    });

    const server = createMcpServer({
      schema: opts.schema,
      contextValue,
      tools,
    });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  };
}
