# syntax=docker/dockerfile:1

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

# Required for PGlite WASM compilation and native addons used during codegen
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY . .

# Install all dependencies including devDependencies (needed for codegen + expo export)
RUN npm ci

# Generate GraphQL schema + types, then export the Expo web bundle to app/dist
RUN npm run codegen && npm run build:app

# ── Stage 2: production ───────────────────────────────────────────────────────
FROM node:24-alpine

WORKDIR /app

# Copy the full built monorepo from builder (preserves workspace symlinks + source for type stripping)
COPY --from=builder /app .

# Drop devDependencies — PGlite WASM and all runtime deps are preserved
RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=4000
# PGlite stores its database files here — mount a volume at /data to persist across restarts.
# Set DATABASE_URL instead to use an external Postgres (see docker-compose.postgres.yml).
ENV PGLITE_DATA_DIR=/data/pgdata

RUN mkdir -p /data

EXPOSE 4000

VOLUME ["/data"]

# Run the server directly as TypeScript — no compile step needed.
# No --preserve-symlinks: Node must resolve the @cubicecho/notes-db workspace symlink
# to its real path (outside node_modules) for type stripping to be allowed.
CMD ["node", "--experimental-transform-types", "server/src/index.ts"]
