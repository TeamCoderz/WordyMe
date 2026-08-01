# ==========================================
# STAGE 1: Pruner
# ==========================================
FROM node:20-alpine AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=web --scope=@repo/backend --docker

# ==========================================
# STAGE 2: Base & Builder
# ==========================================
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Corepack resolves the pnpm version from the `packageManager` field in
# package.json (including its integrity hash), so do not pin a version here —
# a version pinned in this file is silently ignored and only wastes a download.
RUN corepack enable

# Copy pruned files
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

ENV DB_FILE_NAME=file:/app/apps/backend/local.db

# Empty means same-origin: the bundle calls /api and /storage relative to
# whatever host it is served from, and the backend serves the bundle itself.
# Set explicitly so a stray value in the build environment cannot be inlined
# into the JavaScript, which would pin the image to one hostname forever.
ENV VITE_BACKEND_URL=""

RUN pnpm build --filter=web... --filter=@repo/backend...

RUN pnpm --filter @repo/backend --prod deploy --legacy pruned-backend

# ==========================================
# STAGE 3: Runner (all-in-one)
# ==========================================
# One image, one process: Express serves the API, the WebSocket, the uploaded
# files and the web bundle. SQLite is single-writer, so splitting this into web
# and backend containers would buy no scaling — only a hardcoded hostname and a
# backend URL that has to be baked in at build time.
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY --from=builder /app/pruned-backend .
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/drizzle ./drizzle
COPY --from=builder /app/apps/backend/src/scripts/run-migrations.mjs ./run-migrations.mjs

# Served by Express from the same origin as the API. Resolved relative to
# ./dist, not the working directory — see apps/backend/src/lib/web.ts.
COPY --from=builder /app/apps/web/dist ./web

# File modes from the build host travel through COPY, and git does not track
# directory permissions — so a contributor whose umask left `drizzle/meta` at
# 0744 produces an image where the non-root user cannot traverse it, and
# migrations fail with a confusing "Can't find meta/_journal.json". Normalise
# to read-for-all, execute only where it already applies.
RUN chmod -R a+rX ./dist ./drizzle ./web ./run-migrations.mjs

RUN mkdir -p storage && chown -R nodejs:nodejs storage

USER nodejs

ENV NODE_ENV=production
ENV PORT=8080
# Absolute on purpose: a relative path would resolve against the working
# directory, so any `cd` would silently create a second, empty database.
ENV DB_FILE_NAME=file:/app/storage/local.db
ENV CLIENT_URL=http://localhost:8080

EXPOSE 8080

# Lives in the image rather than in compose, so `docker run` users get it too.
# Hits the liveness probe, which does no database work — a container part-way
# through its startup migrations must not be reported as broken.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["sh", "-c", "node run-migrations.mjs && node dist/index.js"]
