# Docker Guide for WordyMe

This guide explains how to run WordyMe using Docker and Docker Compose.

## Prerequisites

- **Docker** >= 20.10
- **Docker Compose** >= 2.0

Make sure Docker is installed and running on your system. You can verify by running:

```bash
docker --version
docker compose version
```

## Quick Start

1. **Clone the repository** (if you haven't already):

   ```bash
   git clone <repository-url>
   cd WordyMe
   ```

2. **Set up environment variables** (required):
   Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   Then set `BETTER_AUTH_SECRET`. It has no default and startup fails without it:

   ```bash
   echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env
   ```

   > **Note**:
   >
   > - The `.env` file is excluded from Docker builds (via `.dockerignore`) for security, but Docker Compose will still read it for variable substitution in `docker-compose.yml`
   > - The `.env.example` file serves as a template with all available environment variables documented

3. **Build and start the containers**:

   ```bash
   docker compose up -d
   ```

4. **Access the application**: http://localhost:8080

   The web app and the API are served from the same origin and the same port.
   There is no separate frontend URL.

## Architecture: one image, one process

WordyMe ships as a **single all-in-one image**. Express serves the API, the
Socket.io WebSocket, uploaded files, and the built web bundle — all from one
port, in one process.

This is a deliberate choice, not a shortcut:

- **SQLite is single-writer.** Splitting web and backend into separate
  containers buys no scaling, because every write still funnels through one
  process holding one database file.
- **Same-origin removes the baked-in URL problem.** Vite inlines
  `import.meta.env.*` into the JavaScript bundle at build time. If the frontend
  had to be told where the backend lives, that address would be frozen into the
  image and a published image could never be pointed at your own domain. Serving
  both from one origin makes every API call relative, so the image works
  unmodified behind any hostname.
- **No hardcoded service hostname.** The old split used an Nginx proxy pointing
  at `http://backend:3000`, which broke the moment the service was renamed or
  run outside compose.
- **A smaller image**, with one process to supervise instead of two.

## Docker Compose Service

`docker-compose.yml` defines a single service, `wordyme`:

- **Image**: `teamcoderz/wordyme:latest`, built from `Dockerfile`
- **Port**: `8080:8080` — override the host side with `HOST_PORT`
- **Environment Variables**:
  - `NODE_ENV=production`
  - `PORT=8080`
  - `DB_FILE_NAME=file:/app/storage/local.db`
  - `CLIENT_URL` (defaults to `http://localhost:8080`)
  - `BETTER_AUTH_URL` (optional)
  - `BETTER_AUTH_SECRET` — **required, no default**, see below
  - `TRUST_PROXY` (optional; set only behind a reverse proxy)
- **Volumes**:
  - `wordyme-storage` → `/app/storage` — SQLite database and uploaded files
- **Logging**: capped at 3 files of 10 MB. Without this, JSON logs grow until the
  disk is full — a real failure mode on a Pi writing to an SD card
- **Hardening**: `no-new-privileges`, all Linux capabilities dropped, and a 1 GB
  memory limit. The app idles around 55 MB, so the limit only catches a runaway
- **Restart Policy**: `unless-stopped`
- **Health Check**: defined in the image itself, so `docker run` users get it
  too. Probes `/api/health` every 30s (5s timeout, 3 retries, 40s start period).

There is deliberately **no `container_name`**, so you can run two stacks side by
side without a name collision.

### `BETTER_AUTH_SECRET` is required

The compose file has no default for `BETTER_AUTH_SECRET`. `docker compose up`
will fail with a clear message until you set one:

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env
```

This is intentional. A default value committed to a public repository is a
published secret — anyone running the stack unchanged would be exposed to
session forgery by someone who simply read the repo.

## Common Commands

### Start Services

```bash
# Start in detached mode (background)
docker compose up -d

# Start with logs visible
docker compose up
```

### Stop Services

```bash
# Stop containers
docker compose stop

# Stop and remove containers
docker compose down

# Stop and remove containers, volumes, and images
docker compose down -v --rmi all
```

### View Logs

```bash
# View all logs
docker compose logs

# View logs for the service
docker compose logs wordyme

# Follow logs in real-time
docker compose logs -f
```

### Rebuild Containers

```bash
# Rebuild and restart
docker compose up -d --build

# Rebuild without cache
docker compose build --no-cache
docker compose up -d
```

### Check Service Status

```bash
# List running containers
docker compose ps

# Check container health
docker compose ps
# Look for "healthy" status in the output
```

## Data Persistence

The application uses Docker volumes to persist data:

- **Volume Name**: `wordyme-storage`
- **Driver**: `local` (default Docker volume driver)
- **Location**: Managed by Docker (typically in `/var/lib/docker/volumes/wordyme-storage/_data/` on Linux)
- **Contains**:
  - SQLite database (`local.db`)
  - Uploaded files and user content
- **Mount Point**: `/app/storage` in the container

### Backup Database

```bash
# Create a backup
docker compose exec wordyme cp /app/storage/local.db /app/storage/local.db.backup

# Copy database from container to host
docker compose cp wordyme:/app/storage/local.db ./backup-local.db
```

> **Note**: libSQL runs in WAL mode, so recent writes may live in
> `local.db-wal` rather than in `local.db`. For a guaranteed-consistent backup,
> stop the container first (`docker compose stop`) and copy all three of
> `local.db`, `local.db-wal` and `local.db-shm`.

### Restore Database

Restoring takes three steps, and skipping either of the last two fails in ways
that are hard to spot:

- **Stop the service first.** Replacing `local.db` underneath a running SQLite
  is not safe.
- **Delete the stale sidecars.** WAL mode leaves `local.db-wal` and
  `local.db-shm` beside the database. SQLite will replay a leftover `-wal`
  against the file you just restored, corrupting it.
- **Fix the file ownership.** `docker cp` preserves the ownership of the file on
  your machine, so the restored database arrives owned by your host user rather
  than the container's `nodejs` user. The result is a container that looks
  completely healthy — it starts, reports `healthy`, and even `/api/health/db`
  passes, because reads still work — while **every write silently fails** with
  `SQLITE_READONLY`.

```bash
# 1. Stop the service so nothing is writing.
docker compose stop wordyme
```

```bash
# 2. Remove the stale sidecars and stream the backup in. Streaming rather than
#    `docker compose cp` means the file is written by the container's own user,
#    so the ownership is correct and no chown is needed.
docker compose run --rm -T --entrypoint sh wordyme -c 'rm -f /app/storage/local.db-wal /app/storage/local.db-shm && cat > /app/storage/local.db' < ./backup-local.db
```

```bash
# 3. Start again.
docker compose start wordyme
```

Then **verify by signing in**, not by checking that the container is healthy —
it reports healthy either way.

> **Why not `docker compose cp`?** It preserves the ownership of the file on
> your machine, so the database arrives owned by your host user instead of the
> container's `nodejs`. The container then starts, reports healthy, and passes
> `/api/health/db` (reads still work) while every write fails with
> `SQLITE_READONLY`. Streaming the bytes in avoids this entirely. Note also that
> `chown` inside the container is not an option here: `cap_drop: ALL` removes
> `CAP_CHOWN` and `CAP_DAC_OVERRIDE`, so not even root can do it.

## Environment Variables

You can customize the application behavior by setting environment variables. There are two ways to do this:

### Method 1: Using a `.env` file (Recommended)

Copy the example file and customize it:

```bash
cp .env.example .env
```

Then edit `.env` with your values. The `.env.example` file contains all available environment variables with descriptions.

**Important Notes:**

- The `.env` file is excluded from Docker builds (via `.dockerignore`) for security - it won't be copied into the image
- Docker Compose automatically reads `.env` files from the project root for variable substitution in `docker-compose.yml`
- All variables are **runtime** variables, passed to the container through the `environment` section in `docker-compose.yml`. Change one and restart — no rebuild needed.
- Nothing is baked into the image at build time any more. `VITE_BACKEND_URL` used to be, which is why the image is now built same-origin instead.
- See `.env.example` for a complete list of all environment variables with descriptions

### What's Excluded from Docker Builds

The `.dockerignore` file excludes the following from Docker builds, **at every
directory depth**:

- **Dependencies**: `**/node_modules`, `.pnpm-store`
- **Build outputs**: `**/dist`, `**/build`, `**/.turbo`, `**/*.tsbuildinfo`, `**/coverage`
- **Environment files**: `**/.env`, `**/.env.*` (but keeps every `**/.env.example`)
- **Databases**: `**/*.db`, `**/*.sqlite`, `**/*.sqlite3`, and their WAL sidecars (`-wal`, `-shm`, `-journal`) for each
- **User uploads**: the whole `storage/` and `apps/backend/storage/` directories
- **Version control & tooling**: `.git`, `.gitignore`, `.github`, `.husky`, `.vscode`, `.idea`
- **Logs and OS cruft**: `**/*.log`, `**/.DS_Store`
- **Docker's own files**: `Dockerfile*`, `docker-compose*.yml`, `.dockerignore`

> **Important — `.dockerignore` is not `.gitignore`.** In a `.dockerignore`, a
> bare pattern such as `dist` matches **only** the root-level path; it does not
> match `apps/web/dist`. That is why every pattern above is written with a
> `**/` prefix. When the last matching pattern is a negation (`!`), the file is
> re-included — which is how `.env.example` survives the `**/.env.*` rule.
>
> **Do not add these to `.dockerignore`:** `patches/` (pnpm applies the Lexical
> patches listed in `pnpm-workspace.yaml` during install — excluding this
> directory breaks the build), `.npmrc`, `pnpm-workspace.yaml`, `turbo.json`,
> and `pnpm-lock.yaml`.

This ensures:

- Smaller build context and faster builds
- No accidental inclusion of secrets, local databases, or user uploads
- Clean production images
- Stable Docker layer caching (stale `dist/` output no longer invalidates the
  cache on every local build)

### Method 2: Directly in `docker-compose.yml`

You can also modify the `environment` section directly in `docker-compose.yml`:

```yaml
environment:
  - BETTER_AUTH_SECRET=your-secret-key-here
  - CLIENT_URL=http://localhost:8080
```

### Available Environment Variables

All variables are read at runtime and can be changed without rebuilding the image:

| Variable             | Description                                                      | Default                         |
| -------------------- | ---------------------------------------------------------------- | ------------------------------- |
| `BETTER_AUTH_SECRET` | Secret key for authentication. **Required — no default.**        | _(none; startup fails without)_ |
| `CLIENT_URL`         | Comma-separated origins for CORS and Better Auth trusted origins | `http://localhost:8080`         |
| `BETTER_AUTH_URL`    | Public origin, when it differs from the first `CLIENT_URL`       | _(unset)_                       |
| `NODE_ENV`           | Node environment                                                 | `production`                    |
| `PORT`               | Port the app listens on, inside the container                    | `8080`                          |
| `DB_FILE_NAME`       | Database file path (absolute)                                    | `file:/app/storage/local.db`    |
| `TRUST_PROXY`        | Set **only** behind a reverse proxy — see below                  | _(unset; not behind a proxy)_   |
| `HOST_PORT`          | Host port compose publishes to (compose only)                    | `8080`                          |

#### `TRUST_PROXY` and login rate limiting

Leave this unset unless a reverse proxy sits in front of the container.

The app rate-limits login attempts, and to do that it needs to know who is
making the request. It reads the client address from the `X-Forwarded-For`
header, which is set by a reverse proxy. When the container's port is reached
directly there is no proxy and no such header, so the app falls back to the real
connection address instead — otherwise rate limiting would silently do nothing
and repeated password guesses would go unthrottled.

Set `TRUST_PROXY` when a proxy really is in front, so the address it reports is
used instead:

```bash
TRUST_PROXY=1          # trust one proxy hop (most common)
TRUST_PROXY=true       # trust whatever X-Forwarded-For says
TRUST_PROXY=10.0.0.0/8 # trust only these addresses
```

> **Do not set this when the port is exposed directly.** Trusting
> `X-Forwarded-For` from arbitrary clients lets an attacker send a different
> value on each request, getting a fresh rate-limit allowance every time and
> defeating the protection entirely.

To reach the app from another machine on your LAN, add that origin to
`CLIENT_URL`:

```bash
CLIENT_URL=http://localhost:8080,http://192.168.1.20:8080
```

> **`VITE_BACKEND_URL` is no longer used when running under Docker.** The web
> bundle is served by the backend from the same origin, so API calls are
> relative and nothing needs to be baked into the JavaScript. It remains
> available for the unusual case of hosting the frontend on a different origin
> from the API, but note that Vite inlines it at build time — set that way, an
> image is pinned to one hostname and cannot be repointed later.

## Troubleshooting

### Port Already in Use

If port 8080 is already in use, publish a different host port — no rebuild needed:

```bash
HOST_PORT=9090 docker compose up -d
```

Then set `CLIENT_URL` to match (`http://localhost:9090`), so CORS and the auth
cookie origin agree with the address you actually use.

To find what is holding the port:

```bash
# Linux/Mac
lsof -i :8080

# Windows
netstat -ano | findstr :8080
```

### Database Issues

If you encounter database errors:

1. **Check volume permissions**:

   ```bash
   docker compose exec wordyme ls -la /app/storage/
   ```

   The files should be owned by `nodejs`. If they are owned by `root`, you are
   most likely using a bind mount instead of the named volume — Docker creates
   those root-owned, and the non-root container user cannot write to them.

2. **Reset the database** (⚠️ **WARNING**: This deletes all data):
   ```bash
   docker compose down -v
   docker compose up -d
   ```

### Build Failures

If the build fails:

1. **Clear Docker cache**:

   ```bash
   docker system prune -a
   ```

2. **Rebuild from scratch**:
   ```bash
   docker compose build --no-cache
   docker compose up -d
   ```

### Container Won't Start

1. **Check logs**:

   ```bash
   docker compose logs wordyme
   ```

2. **Verify health status**:

   ```bash
   docker compose ps
   ```

3. **Check container resources**:
   ```bash
   docker stats
   ```

## Development vs Production

### Production Build

The Docker setup is optimized for production:

- **Multi-stage builds** for smaller images (pruner → builder → runner)
- **Turbo pruning** to include only necessary monorepo packages
- **Production dependencies only** (via `pnpm --prod deploy`)
- **Database migrations** run at container start, before the server listens
- **Health check baked into the image**, so `docker run` users get it too
- **Automatic restarts** on failure (`unless-stopped` restart policy)
- **Non-root user** (`nodejs`, UID 1001)

### Development

For development, it's recommended to run the application locally:

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev
```

This provides:

- Hot module replacement
- Better error messages
- Faster iteration
- Development tools

## Dockerfile Architecture

The `Dockerfile` uses a multi-stage build process optimized for a monorepo:

### Stage 1: Pruner

- **Base**: `node:20-alpine`
- **Purpose**: Uses Turbo to prune the monorepo, keeping only files needed for `web` and `@repo/backend` packages
- **Output**: Pruned workspace with only necessary dependencies

### Stage 2: Builder

- **Base**: `node:20-alpine` with `libc6-compat`
- **Package Manager**: pnpm (via Corepack, version resolved from the `packageManager` field in the root `package.json` — currently 10.33.0)
- **Process**:
  1. Copies pruned files from pruner stage
  2. Installs dependencies with `pnpm install --frozen-lockfile`
  3. Builds both the backend and the web app
  4. Creates a production-only deployment of the backend (`pnpm --prod deploy`)
- **Output**: compiled backend (`apps/backend/dist`) and web bundle (`apps/web/dist`)

`VITE_BACKEND_URL` is pinned to the empty string here, so the bundle uses
relative URLs and no hostname is inlined into the JavaScript.

### Stage 3: Runner (all-in-one)

- **Base**: `node:20-alpine` with `libc6-compat`
- **User**: Runs as non-root user (`nodejs`, UID 1001)
- **Contents**:
  - Production backend dependencies and compiled `dist/`
  - Drizzle migrations and `run-migrations.mjs`
  - The web bundle at `/app/web`, served by Express
  - `/app/storage` for the database and uploads
- **Exposes**: port 8080
- **Health check**: `GET /api/health` — a liveness probe that does no database
  work, so a container running startup migrations is not marked unhealthy
- **Command**: runs migrations, then starts the server

Request handling inside the single process:

| Path            | Handled by                                                             |
| --------------- | ---------------------------------------------------------------------- |
| `/api/*`        | Express API routers                                                    |
| `/storage/*`    | Express file routes (uploads, avatars, attachments)                    |
| `/socket.io/`   | Socket.io, attached to the same HTTP server                            |
| `/docs`         | Scalar API reference                                                   |
| everything else | Static web bundle, falling back to `index.html` for client-side routes |

Caching is set per file type: fingerprinted assets under `/assets/` are
immutable for a year, while `index.html` and the service worker are never
cached for long — otherwise clients would pin themselves to an old build.

This approach results in:

- **Smaller final images**: one runtime, only production dependencies
- **Faster builds**: Turbo pruning reduces build context, layer caching optimizes rebuilds
- **Better security**: minimal base image, non-root user
- **Portability**: no hostname baked into the bundle, so one image works behind any domain

## Advanced Usage

### Running without Compose

The image is self-contained, so `docker run` works too:

```bash
docker run -d \
  -p 8080:8080 \
  -e BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  -e CLIENT_URL=http://localhost:8080 \
  -v wordyme-storage:/app/storage \
  teamcoderz/wordyme:latest
```

The health check is part of the image, so `docker ps` reports health here just
as it does under compose.

### Executing Commands in the Container

```bash
# Shell into the container
docker compose exec wordyme sh

# Run a one-off command
docker compose exec wordyme node -v
```

### Custom Network Configuration

Compose creates a network automatically. To use a custom one, modify
`docker-compose.yml`:

```yaml
services:
  wordyme:
    networks:
      - wordyme-network

networks:
  wordyme-network:
    driver: bridge
```

### Running Behind a Reverse Proxy

Because everything is same-origin, there is only one upstream to point at.
Forward all traffic — including `/socket.io/` with WebSocket upgrade headers —
to the single container port, then set `CLIENT_URL` to your public URL:

```bash
CLIENT_URL=https://notes.example.com
```

## Security Considerations

1. **Set `BETTER_AUTH_SECRET`**: it has no default and startup fails without it, by design. Generate one with:

   ```bash
   openssl rand -base64 32
   ```

2. **Environment Files**: `.env` files are excluded from Docker builds at every directory depth (via `.dockerignore`), so no secret is copied into the image. Docker Compose still reads them for variable substitution, but they remain on the host only.

3. **Non-Root User**: the container runs as a non-root user (`nodejs`, UID 1001).

4. **Minimal Base Images**: Alpine Linux base images, for a smaller attack surface.

5. **Use HTTPS**: in production, terminate TLS at a reverse proxy (Traefik, Caddy, Nginx) in front of the container. When you do, set `TRUST_PROXY` so login rate limiting sees the real client address.

6. **Limit Port Exposure**: only one port (8080) needs publishing. Behind a reverse proxy, bind it to loopback — `127.0.0.1:8080:8080` — so it is not reachable directly.

7. **Reduced Privileges**: the container runs with `no-new-privileges` and every Linux capability dropped (`cap_drop: ALL`). It needs none — it listens on a high port as a non-root user and only reads and writes files. Note this also means `chown` cannot be run inside the container, which affects how you restore a backup (see above).

8. **Bounded Logs and Memory**: logs are capped at 3 × 10 MB and memory at 1 GB, so neither a log flood nor a runaway process can take down the host.

9. **Regular Updates**: keep the image and its base image patched.

10. **Volume Permissions**: `/app/storage` is created owned by the `nodejs` user.

11. **Database Isolation**: local development databases and uploads are excluded from builds, so they cannot leak into a published image.

### Known gaps

These are tracked and not yet addressed:

- **The base image is `node:20-alpine`**, and Node 20 reached end of life on
  30 April 2026. Upgrading is the next planned change.
- **Bind mounts do not work out of the box.** Docker creates a bind mount
  (`./data:/app/storage`) owned by root, which the non-root container user
  cannot write to. Use the named volume in `docker-compose.yml`, which does not
  have this problem.

### Shutdown behaviour

`docker stop` shuts down cleanly in well under a second. The container runs
`tini` as PID 1 so signals actually arrive, and on `SIGTERM` the app stops
accepting connections, disconnects clients, and waits for queued database writes
to finish before exiting — SQLite is single-writer, so being killed mid-write is
the failure worth avoiding. If shutdown ever takes longer than 8 seconds, the
process exits anyway rather than waiting to be killed.

## Support

For issues or questions:

1. Check the logs: `docker compose logs`
2. Review this documentation
3. Check the main [README.md](README.md) for general project information
4. Open an issue on the repository
