import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express4';
import { db } from '@cubicecho/notes-db';
import cors from 'cors';
import express from 'express';
import { type Context, createContext } from './context.ts';
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
    context: ({ req }) =>
      createContext({
        db,
        authHeader: req.headers.authorization,
        demoUserId: DEMO_USER_ID,
      }),
  }),
);

// Serve the built Expo web client (app/dist) in production so the API and the
// web app are delivered from a single container. Skipped in dev, where the
// client runs under `expo start`.
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(__dirname, '../../app/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

await new Promise<void>((resolve) =>
  httpServer.listen({ port: PORT }, resolve),
);
console.log(`GraphQL server ready at http://localhost:${PORT}/graphql`);
if (process.env.NODE_ENV === 'production') {
  console.log(`Web app served at http://localhost:${PORT}`);
}
