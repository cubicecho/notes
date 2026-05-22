import http from 'node:http';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express4';
import { db } from '@cubicecho/notes-db';
import cors from 'cors';
import express from 'express';
import type { Context } from './context.ts';
import { buildAppSchema } from './schema/index.ts';

const schema = buildAppSchema(db);

const DEMO_USER_ID =
  process.env.DEMO_USER_ID ?? '00000000-0000-0000-0000-000000000001';
const PORT = Number(process.env.PORT ?? 4000);

const app = express();
const httpServer = http.createServer(app);

const server = new ApolloServer<Context>({
  schema,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

await server.start();

app.use(
  '/graphql',
  cors<cors.CorsRequest>({
    origin: process.env.APP_URL ?? 'http://localhost:8081',
  }),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const userId = token ?? DEMO_USER_ID;
      let membershipsPromise:
        | Promise<{ orgId: string; role: 'owner' | 'member' }[]>
        | undefined;

      return {
        db,
        userId,
        getUserMemberships: () => {
          if (membershipsPromise === undefined) {
            membershipsPromise = db.query.orgMembers
              .findMany({ where: { userId } })
              .then((ms: { orgId: string; role: 'owner' | 'member' }[]) =>
                ms.map((m) => ({ orgId: m.orgId, role: m.role })),
              );
          }
          // biome-ignore lint/style/noNonNullAssertion: assigned in the branch above
          return membershipsPromise!;
        },
      };
    },
  }),
);

await new Promise<void>((resolve) =>
  httpServer.listen({ port: PORT }, resolve),
);
console.log(`GraphQL server ready at http://localhost:${PORT}/graphql`);
