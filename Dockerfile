# ==========================================
# STAGE 1: Pruner
# ==========================================
# Pinned by digest, not just by tag: the amd64 and arm64 halves of a release
# are built by separate jobs that each resolve the base independently, so an
# upstream republish between them would ship two architectures built on
# different bases. The digest names the multi-arch index, so each job still
# selects its own platform from it.
#
# To update:  docker buildx imagetools inspect node:22-alpine
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo@2.9.3
COPY . .
RUN turbo prune --scope=web --scope=@repo/backend --docker

# A release commit changes only the root version field, but that ripples into
# out/json and would evict the pnpm-install layer below on every release even
# though the dependency tree is identical. Pin the field in the install-only
# manifests; out/full restores the real one before anything is built, so the
# published image never sees this value.
RUN node -e "const fs=require('fs');const p='out/json/package.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));j.version='0.0.0';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n')"

# ==========================================
# STAGE 2: Base & Builder
# ==========================================
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS builder
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

# Strip build tooling that `pnpm deploy` drags in because better-auth declares
# drizzle-kit as an optional peer. None of it runs in production: drizzle-kit is
# a migration *generator*, while the runtime uses drizzle-orm/libsql/migrator.
# It matters for more than size — the esbuild binary it pulls in accounted for
# 36 of the image's 67 vulnerability findings on its own, all in Go stdlib.
# Also drop the libSQL builds for other platforms; this image is Alpine (musl).
#
# This runs in the builder, before the COPY below, on purpose. Deleting in the
# runner stage would leave the files in the copied layer and only add a whiteout
# on top — the vulnerabilities would go but the megabytes would not.
RUN rm -rf \
        pruned-backend/node_modules/.pnpm/drizzle-kit@* \
        pruned-backend/node_modules/.pnpm/esbuild@* \
        pruned-backend/node_modules/.pnpm/@esbuild+* \
        pruned-backend/node_modules/.pnpm/@libsql+linux-*-gnu@* \
        pruned-backend/node_modules/.pnpm/@libsql+darwin-* \
        pruned-backend/node_modules/.pnpm/@libsql+win32-* \
    && rm -f pruned-backend/node_modules/.bin/drizzle-kit \
             pruned-backend/node_modules/.bin/esbuild

# ==========================================
# STAGE 3: Runner (all-in-one)
# ==========================================
# One image, one process: Express serves the API, the WebSocket, the uploaded
# files and the web bundle. SQLite is single-writer, so splitting this into web
# and backend containers would buy no scaling — only a hardcoded hostname and a
# backend URL that has to be baked in at build time.
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS runner
WORKDIR /app

# tini becomes PID 1. A process running as PID 1 does not get the kernel's
# default signal handling, so without an init the container ignores SIGTERM and
# `docker stop` waits out its timeout before SIGKILL — killing a live SQLite
# writer. tini forwards signals properly and reaps zombies.
RUN apk add --no-cache libc6-compat tini

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# A production container runs `node`, never `npm`. The base image bundles npm,
# and npm vendors its own copies of tar, sigstore, picomatch, brace-expansion
# and ip-address — which accounted for 14 of the 16 vulnerability findings left
# after pruning the app's own tree, including a critical one in tar. None of it
# is reachable at runtime, but shipping it means every scan reports issues this
# image has no way to fix, and it leaves a package installer sitting in the
# container for anyone who does get in. Removing it cannot reclaim the disk
# space (the files live in the base image layer) but it does remove the risk.
RUN rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/bin/npm \
           /usr/local/bin/npx

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

ENTRYPOINT ["/sbin/tini", "--"]

# `exec` matters: without it the shell stays alive as the parent, and the signal
# tini forwards would reach sh rather than Node.
CMD ["sh", "-c", "node run-migrations.mjs && exec node dist/index.js"]
