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

## Quick Start (self-hosting)

You do not need to clone the repository. Published images cover both
`linux/amd64` and `linux/arm64`, so this works on a normal server and on a
Raspberry Pi 4 or 5.

1. **Fetch the compose file**:

   ```bash
   curl -O https://raw.githubusercontent.com/TeamCoderz/WordyMe/main/docker-compose.public.yml
   ```

2. **Set a signing secret** (required — startup fails without it):

   ```bash
   [ -e .env ] || ( umask 077; echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" > .env )
   ```

   The `umask` keeps `.env` readable only by you — it holds the key that signs
   every session cookie, and a default umask would leave it world-readable. The
   guard means re-running this will not overwrite a `.env` you have already
   customised, or rotate the secret and log everyone out.

3. **Start it**:

   ```bash
   docker compose -f docker-compose.public.yml up -d
   ```

4. **Open** <http://localhost:8080> and create the first account.

   The web app and the API are served from the same origin and the same port.
   There is no separate frontend URL.

### Where to pull from

The same image is published to two registries on every release:

| Registry   | Image                        | Notes                             |
| ---------- | ---------------------------- | --------------------------------- |
| GHCR       | `ghcr.io/teamcoderz/wordyme` | **Default.** No pull rate limits. |
| Docker Hub | `teamcoderz/wordyme`         | Easier to find; rate limited.     |

GHCR is the default in `docker-compose.public.yml` because Docker Hub limits
unauthenticated pulls to 100 per 6 hours **per IP address** — a budget shared by
everyone behind the same office or campus NAT. Both registries carry identical
images; switch by changing one line.

### Which tag to use

| Tag            | Moves?               | Use when                                 |
| -------------- | -------------------- | ---------------------------------------- |
| `latest`       | Every stable release | You want updates when you re-pull        |
| `1.2.3`        | Never                | You want to upgrade deliberately         |
| `1.2`          | Within a minor line  | You want patches but not feature changes |
| `sha-<commit>` | Never                | You need to pin an exact build           |

Pre-releases (`1.3.0-beta.1`) are published but never tagged `latest`.

## Running from source instead

Contributors building locally use the other compose file, which builds the image
rather than pulling it:

```bash
cp .env.example .env
```

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env
```

```bash
docker compose up -d --build
```

> **Note**: `.env` is excluded from Docker builds via `.dockerignore`, so no
> secret is baked into the image. Compose still reads it for variable
> substitution.

## Upgrading from a version before the all-in-one image

Earlier releases ran two containers — Nginx on port 5173 serving the web app,
and the API on port 3000. That is now a single container on port 8080. Fresh
installs need none of this; skip to the next section.

Your `.env` is not part of the image and survives the upgrade untouched, so it
still names the old ports. Two values have to change before the app will work.

1. **Point `CLIENT_URL` at the address you actually open in the browser.**

   ```diff
   - CLIENT_URL=http://localhost:5173
   + CLIENT_URL=http://localhost:8080
   ```

   This is the one that bites. Better Auth rejects any request whose `Origin`
   is not listed in `CLIENT_URL`, so leaving it on `5173` makes every sign-in
   fail with `403 Invalid origin` — while the container reports healthy and
   every page loads normally. It reads like a wrong password, not a
   misconfiguration. The server now prints its trusted origins at startup and
   warns when they cannot match the port it is listening on.

2. **Remove `BETTER_AUTH_URL` if it points at the old API port.** It defaults
   to the first `CLIENT_URL`, which is what you want:

   ```diff
   - BETTER_AUTH_URL=http://localhost:3000
   ```

   Keep it only when the canonical public URL is not first in `CLIENT_URL`.

3. **Leave `BETTER_AUTH_SECRET` alone.** It signs session cookies; changing it
   signs out every user.

Then rebuild, and remove the containers from the old layout in the same step:

```bash
docker compose up -d --build --remove-orphans
```

`--build` matters: `docker compose up` reuses an existing image and will
silently keep running the old code. `--remove-orphans` matters just as much —
without it the previous `wordyme-backend` and `wordyme-web` containers keep
running, and the old backend holds the _same_ SQLite file open as the new one.
SQLite allows a single writer, so two containers sharing it risks lock errors
and corruption.

Your data is safe throughout: documents, uploads and accounts live in the
`wordyme-storage` volume, which neither rebuilding nor removing containers
touches. To be certain, take a backup first — see
[Data Persistence](#data-persistence).

If you published the app on a different host port, use that everywhere instead
of `8080`:

```bash
HOST_PORT=9000
CLIENT_URL=http://localhost:9000
```

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

The database runs in SQLite's write-ahead-log mode (`journal_mode=WAL`,
verifiable with `PRAGMA journal_mode`). Recent commits live in a companion
`local.db-wal` file until SQLite folds them back into `local.db`, so **a copy of
`local.db` on its own is not the whole database** — taken at the wrong moment it
is missing your most recent edits, and on a young instance it can be missing
everything.

Writes also run with `synchronous=NORMAL`, which lets SQLite return from a
commit before the operating system has flushed it to disk. That is a deliberate
trade for speed on the small machines this image targets, and it is safe against
the app or the container dying — WAL still recovers a consistent database. The
window it opens is narrow and specific: a **host** power cut or kernel panic can
cost the last few commits. On a server without a UPS, take backups accordingly.

Two consequences worth knowing before you rely on a backup:

- **Back up the whole `/app/storage` volume, not just `local.db`.** The database
  holds document metadata, but the text of every revision lives in
  `storage/revisions/` and uploads live in `storage/attachments/`. A database
  restored without those files gives you a document list where nothing opens.
- **Keep the volume on local disk.** WAL requires all readers to share memory
  with the writer, which network filesystems (NFS, SMB, most NAS mounts) do not
  provide. Pointing the volume at one risks corruption.

Stopping the service first is still the safest option, and it now leaves a
self-contained `local.db`: shutdown checkpoints the WAL back into the main file
before exiting.

```bash
docker compose stop wordyme
```

Copy into a directory that does not already exist, so each backup stands alone —
`docker compose cp` into an existing directory nests the copy inside it, leaving
the previous backup at the path you would restore from:

```bash
docker compose cp wordyme:/app/storage "./wordyme-backup-$(date +%Y%m%d-%H%M%S)"
```

```bash
docker compose start wordyme
```

That directory is the whole backup: `local.db` plus `revisions/`,
`attachments/`, `images/` and `covers/`.

To back up without stopping, let SQLite write the database copy for you — this
is safe against a concurrent write, where a plain file copy is not. The target
must not already exist, so remove any previous one first:

```bash
docker compose exec wordyme sh -c 'rm -f /app/storage/backup.db && node -e "const{createClient}=require(\"@libsql/client\");createClient({url:process.env.DB_FILE_NAME}).execute(\"VACUUM INTO \x27/app/storage/backup.db\x27\").then(()=>console.log(\"ok\"),e=>{console.error(e.message);process.exit(1)})"'
```

Then collect `backup.db` **and** the `revisions/`, `attachments/`, `images/` and
`covers/` directories — the database alone restores a document list where
nothing opens. Delete `backup.db` from the volume afterwards so it is not swept
into later backups.

Before restoring a live backup, rename `backup.db` to `local.db` inside your
backup directory. The service only ever opens `local.db` — restore the file
under its backup name and the app silently keeps running on the old database
beside it. If you take live backups, verify one by restoring it.

### Restore Database

Restoring takes three steps, and getting the middle one wrong fails in ways that
are hard to spot:

- **Stop the service first.** Replacing `local.db` underneath a running SQLite
  is not safe.
- **Restore the content files too, not only the database.** The text of every
  revision and every upload lives beside `local.db` in the same volume. A
  database restored on its own gives you a workspace where every document is
  listed and none will open.
- **The database must be named `local.db`.** A live backup produced
  `backup.db`; rename it to `local.db` in your backup directory before
  restoring, or the app keeps running on the old database beside it.
- **Clear any leftover journal.** If the process was killed mid-write, a
  `local.db-journal`, `local.db-wal` or `local.db-shm` can survive. On the next
  open SQLite treats them as belonging to the file you just restored and replays
  or rolls back part of them into it. The command below removes all three.

  This is correct when the backup is a **self-contained** `local.db` — one taken
  with the service stopped, or produced by `VACUUM INTO`. If instead you saved
  `local.db` together with its own `-wal` and `-shm`, restore all three and do
  **not** delete them, or you will discard the writes they carry.

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
# 2. Clear any leftover journal and stream the whole backup in — database and
#    content files together. Streaming rather than `docker compose cp` means
#    everything is written by the container's own user, so the ownership is
#    correct and no chown is needed. Use your backup directory's real name.
tar cf - -C ./wordyme-backup-YYYYmmdd-HHMMSS . | docker compose run --rm -T --entrypoint sh wordyme -c 'rm -f /app/storage/local.db-journal /app/storage/local.db-wal /app/storage/local.db-shm && cd /app/storage && tar xf -'
```

```bash
# 3. Start again.
docker compose start wordyme
```

Then **verify by opening a document**, not by signing in and not by checking that
the container is healthy. A database restored without its content files lets you
sign in and lists every document, and the container reports healthy throughout —
the damage only shows when a document fails to open.

> **Why not `docker compose cp`?** It preserves the ownership of the file on
> your machine, so the database arrives owned by your host user instead of the
> container's `nodejs`. The container then starts, reports healthy, and passes
> `/api/health/db` (reads still work) while every write fails with
> `SQLITE_READONLY`. Streaming the bytes in avoids this entirely. Note also that
> `chown` inside the container is not an option here: `cap_drop: ALL` removes
> `CAP_CHOWN` and `CAP_DAC_OVERRIDE`, so not even root can do it.

### Resetting a Forgotten Password

This app has no mail transport, so there is no "forgot password" email, and
sign-up is closed once the first account exists. If you lock yourself out, reset
the password from the host instead.

Set a new password, generated for you and printed once:

```bash
docker compose exec wordyme node reset-password.mjs
```

Or choose it yourself:

```bash
docker compose exec wordyme node reset-password.mjs --password 'a long passphrase'
```

Sign-up closes after the first account, so there is only ever one to reset and
the email can be left out. Pass it explicitly if you prefer, and use `--list` if
you have forgotten which address you signed up with:

```bash
docker compose exec wordyme node reset-password.mjs --list
```

The hash is produced by Better Auth itself, so the new password works exactly
like one set through the UI. Every existing session is signed out, on the view
that a reset which leaves old sessions alive is not a reset. Anyone who can run
`docker compose exec` already has the database, so this grants no access they
did not have — but it does mean the command belongs to the host operator, not to
end users.

### Reclaiming Orphaned Files

Deleting a document removes its rows and its files together. Deletions made by
older versions removed only the rows, so their revision and attachment files are
still on the volume, referenced by nothing. `prune-orphans.mjs` finds them.

It reports and exits, changing nothing:

```bash
docker compose exec wordyme node prune-orphans.mjs
```

Remove what it listed:

```bash
docker compose exec wordyme node prune-orphans.mjs --delete
```

It refuses to run unless `DB_FILE_NAME` points at a database with the expected
tables and at least one account, and it ignores anything modified in the last
hour, which keeps an upload in flight out of the sweep. The check is a
snapshot, not a lock — for certainty, run `--delete` with the service stopped
(`docker compose stop wordyme`, then `docker compose run --rm wordyme node
prune-orphans.mjs --delete`). Always run the report first and read it: pointed
at the wrong database, every live file looks unreferenced.

The exit code distinguishes two different conditions, which matters if you run
this from cron or CI:

| Code | Meaning                                                                       |
| ---- | ----------------------------------------------------------------------------- |
| `0`  | Nothing orphaned, and every revision has its content file.                    |
| `2`  | It ran fine, but some revisions reference a content file that is not on disk. |

Exit `2` is the opposite problem from an orphan: rows pointing at files that are
gone, which this script never fixes because it never deletes rows. Documents
holding one of those as their current version fail to open, and the fix is to
restore the missing files from a backup. Treating any non-zero exit as a failed
prune would page you for a condition that needs a restore instead.

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

| Variable             | Description                                               | Default                         |
| -------------------- | --------------------------------------------------------- | ------------------------------- |
| `BETTER_AUTH_SECRET` | Secret key for authentication. **Required — no default.** | _(none; startup fails without)_ |
| `TRUST_HOST`         | Accept the address each request arrives on — see below    | `true`                          |
| `CLIENT_URL`         | Extra origins to trust, comma separated. Also sets CORS   | `http://localhost:8080`         |
| `BETTER_AUTH_URL`    | Public address users type. **Set this when using HTTPS**  | _(unset)_                       |
| `NODE_ENV`           | Node environment                                          | `production`                    |
| `PORT`               | Port the app listens on, inside the container             | `8080`                          |
| `DB_FILE_NAME`       | Database file path (absolute)                             | `file:/app/storage/local.db`    |
| `TRUST_PROXY`        | Set **only** behind a reverse proxy — see below           | _(unset; not behind a proxy)_   |
| `UPDATE_CHECK`       | Ask GitHub whether a newer release exists — see below     | `true`                          |
| `HOST_PORT`          | Host port compose publishes to (compose only)             | `8080`                          |

#### Update notifications

The app tells you in the user menu when a newer WordyMe release has been
published. To find out, the **server** — not your browser — asks the GitHub
releases API which release is newest, at most once every six hours, and caches
the answer. Nothing is ever downloaded or installed: updating stays a command
you run yourself.

That request reveals this instance's IP address to GitHub. If you would rather
your deployment made no outbound calls at all, turn it off:

```bash
UPDATE_CHECK=false
```

Set to `false`, the server never contacts GitHub, and the menu shows the
version with nothing about updates. This is a real switch, not a hidden
button — no request is made.

Leaving it on is recommended. Knowing a release exists is how you find out
about security fixes, and the check is one request every six hours.

#### Deployment scenarios

The container cannot know the address you type into your browser. Better Auth
refuses any request whose `Origin` it does not trust, which shows up as
**`403 Invalid origin`** when you try to create an account — the page loads, the
password is simply refused.

`TRUST_HOST=true`, the default, solves this by accepting whichever host the
request arrived on. Pick your row:

| How you reach it                                         | What to set                                  |
| -------------------------------------------------------- | -------------------------------------------- |
| `http://localhost:8080` on the Docker host               | Nothing                                      |
| `http://192.168.1.50:8080` — a Pi or NAS on your LAN     | Nothing                                      |
| `http://wordy.local:8080` — a hostname                   | Nothing                                      |
| `http://100.64.1.2:8080` — Tailscale or a VPN            | Nothing                                      |
| `http://notes.example.com:8080` — a VPS, plain HTTP      | Nothing                                      |
| `https://notes.example.com` — behind a reverse proxy     | `BETTER_AUTH_URL` and `TRUST_PROXY`, below   |
| Deployed via **Coolify or Dokploy** with a domain        | Works as-is; two settings recommended, below |
| A frontend hosted on a **different** origin from the API | Add that origin to `CLIENT_URL`              |

**Is trusting the host safe?** Yes. It does not mean "trust everyone" — it means
"trust the address this request was actually sent to". A browser always sets
`Host` to the server it is talking to, so a malicious page on `evil.com` reaches
you as `Origin: https://evil.com` with `Host: notes.example.com`. Those differ,
so it is still refused. Cross-site request forgery protection is unchanged.

Set `TRUST_HOST=false` if you would rather pin the app to an explicit list. Then
only the origins in `CLIENT_URL` are accepted, which is how the app behaved
before this option existed.

#### Serving over HTTPS

Two extra settings, and they matter:

```bash
BETTER_AUTH_URL=https://notes.example.com
TRUST_PROXY=1
```

`BETTER_AUTH_URL` is what marks session cookies `Secure`, so the browser
refuses to ever send them over an unencrypted connection. **Without an HTTPS
address configured, cookies lack that flag** — they still work over HTTPS, but
a downgrade or a stray `http://` link would send them in the clear. The
container cannot detect TLS itself, because the proxy speaks plain HTTP to it.
(An HTTPS origin in `CLIENT_URL` also enables the flag when `BETTER_AUTH_URL`
is unset, but the canonical address belongs in `BETTER_AUTH_URL`.) The app
warns at startup when `TRUST_PROXY` is set and no HTTPS address is configured
in either variable.

`TRUST_PROXY` is what makes login rate limiting see the real client address
rather than the proxy's — see the section below.

Setting `TRUST_PROXY` declares that your proxy owns every `X-Forwarded-*`
header, so the proxy must **set or overwrite** them all — never pass a
client-supplied value through. A header the proxy neglects becomes
attacker-controlled: a forwarded `X-Forwarded-Host` would override the host
used for origin checks, and a forwarded `X-Forwarded-For` would let clients
pick their own rate-limit identity. Caddy and Traefik overwrite all of these
and pass the original `Host` through by default; for nginx, set every one
explicitly:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

Avoid listing both `http://` and `https://` origins in `CLIENT_URL`. Cookies
carry a single `Secure` setting, so one of the two schemes will always be wrong.
Set `BETTER_AUTH_URL` to the canonical address instead; the app warns if it sees
a mixture.

#### Coolify, Dokploy and similar platforms

These platforms are the reverse-proxy case above with the proxy managed for you:
their built-in Traefik terminates TLS for your domain and forwards plain HTTP to
the container. Traefik passes the original `Host` header through by default, so
with `TRUST_HOST` on, **sign-up and sign-in work with no configuration at all**.

Three things to set in the platform's UI for a production install:

1. `BETTER_AUTH_SECRET` — required; the container refuses to start without it.
2. `BETTER_AUTH_URL=https://your-domain` and `TRUST_PROXY=1` — the two settings
   from the section above. Each fixes its own thing, and the app works without
   either: `BETTER_AUTH_URL` is what marks session cookies `Secure`, and
   `TRUST_PROXY` is what stops login rate limiting seeing every user as the
   proxy's address.
3. A **persistent volume mounted at `/app/storage`** — otherwise the database
   and every uploaded file are lost on each redeploy.

Point the platform at container port `8080`. If you skip step 2, the app logs a
one-time hint when it notices forwarded HTTPS traffic, naming exactly these
settings.

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
TRUST_PROXY=1           # trust one proxy hop (most common)
TRUST_PROXY=2           # two proxies in front, e.g. Cloudflare then nginx
TRUST_PROXY=10.0.0.0/8  # trust only these addresses
```

> **`TRUST_PROXY=true` is rejected at startup, on purpose.** It would make
> Express take the left-most `X-Forwarded-For` entry, and any client can prepend
> one. Because proxies normally _append_ to that chain rather than replacing it,
> a forged entry stays on the left and wins — so an attacker could present a
> different address on every request and get a fresh rate-limit allowance each
> time. A hop count or an address list is resolved from the right instead, which
> a client cannot influence.

Whatever the setting, the client address is resolved by the server and the
`X-Forwarded-For` header is then **overwritten** with the result, so no raw
client-supplied value ever reaches the rate limiter.

> **Do not set this when the port is exposed directly** — there is no proxy to
> trust, and the default already uses the real connection address.

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

- **Base**: `node:22-alpine`
- **Purpose**: Uses Turbo to prune the monorepo, keeping only files needed for `web` and `@repo/backend` packages
- **Output**: Pruned workspace with only necessary dependencies

### Stage 2: Builder

- **Base**: `node:22-alpine` with `libc6-compat`
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

- **Base**: `node:22-alpine` with `libc6-compat`
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
| `/api/docs`     | Scalar API reference                                                   |
| `/storage/*`    | Express file routes (uploads, avatars, attachments)                    |
| `/socket.io/`   | Socket.io, attached to the same HTTP server                            |
| everything else | Static web bundle, falling back to `index.html` for client-side routes |

Server routes live under `/api` and `/storage` only. Every other path belongs to
the web app — `/docs` and `/spaces`, for instance, are its own screens — so the
API reference is served at `/api/docs` rather than at the top level.

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

### Adding CJK fonts to the PDF viewer

Only relevant if your PDFs are Japanese, Korean or Chinese **and** were saved
without embedding their fonts. Most are not: embedding is the norm for those
languages precisely because the reader cannot be assumed to have the fonts.
Everything renders from the file itself, and no font here is ever consulted.

Arabic and Hebrew fallbacks ship with the image. The CJK packs come to roughly
139 MB between them — about 40% on top of the image — so they are wired up but
left for you to add if you need them.

First copy out the fonts the image already ships, because a bind mount
**replaces** the directory rather than merging with it — mount over it without
them and you remove the Arabic, Hebrew, Cyrillic, Greek and Vietnamese
fallbacks you had:

```bash
mkdir -p pdf-fonts
docker compose cp wordyme:/app/web/pdf-fonts/. ./pdf-fonts/
```

Then add whichever CJK packs you need. Drop the ones you do not want from the
list — each is ~30-40 MB:

```bash
for pkg in fonts-jp fonts-kr fonts-sc fonts-tc; do
  npm pack "@embedpdf/$pkg"
  tar -xzf "embedpdf-$pkg"-*.tgz -C pdf-fonts --strip-components=2 package/fonts
done
rm -f embedpdf-fonts-*.tgz
```

Every command here runs from the same directory — the one holding `pdf-fonts`,
not inside it. `tar` extracts one archive per `-f`, which is why this loops
rather than globbing them all into a single call.

Then mount it:

```yaml
services:
  wordyme:
    volumes:
      - ./pdf-fonts:/app/web/pdf-fonts
```

**Use the filenames as shipped.** Simplified Chinese is `NotoSansHans-*` and
Traditional is `NotoSansHant-*`, despite the packages being named `fonts-sc`
and `fonts-tc`. A renamed file never loads, and the only symptom is one line in
the browser console.

No rebuild and no restart-time configuration: the files are fetched by URL when
a document needs them. `apps/web/public/pdf-fonts/README.md` lists every
supported filename.

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

- **Node 22 leaves security support around April 2027.** The base image will need
  moving to a newer LTS line before then.
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

## How images are published

Releasing is two steps, with a pull request in the middle.

**Prepare Release** (`.github/workflows/release-prepare.yml`) is run by hand.
It bumps the version, writes the changelog, commits that to a `release/vX.Y.Z`
branch and pushes it. Nothing is tagged or published. A maintainer then opens
the pull request the run summary links to, and merges it once the checks pass.

**Publish Release** (`.github/workflows/release-publish.yml`) fires on that
merge. It builds and scans each architecture natively on a runner of its own
kind — amd64 on `ubuntu-latest`, arm64 on `ubuntu-24.04-arm`, in parallel —
pushes each image by digest, merges the digests into the tagged multi-arch
manifests, then tags the commit and creates the GitHub release. The tag comes
last deliberately: it is the completion marker, so a release that fails at the
vulnerability gate or a registry push leaves no tag behind and is retried by
simply re-running the workflow.

Because each architecture is pushed by digest before the merge step tags
them, a release that fails midway can leave untagged manifests on the
registries. They are invisible to `docker pull`, immutable and harmless — but
never point "delete untagged versions" housekeeping at these packages: the
per-architecture and attestation manifests of every _released_ tag are also
listed as untagged, and deleting them breaks pulls of published releases.
One more property carried over from the old pipeline: re-running an old
failed release run after a newer version has shipped re-points `latest` at
the older version, so finish or discard failed release runs promptly.

The split exists because `main` requires status checks. A version bump pushed
straight there has never existed anywhere CI could run, so the checks can never
appear on it and the push is refused. Routing it through a branch means the
release commit is tested like any other change, and no bypass or long-lived
token is needed.

Two consequences of the same GitHub behaviour are worth knowing, because both
shaped the design: GitHub does not start workflow runs from events created with
`GITHUB_TOKEN`. That is why the prepare workflow does not open the pull request
itself — one it opened would sit with no checks and could never be merged — and
why tagging and publishing stay in a single run rather than splitting into an
`on: push: tags` workflow, which would never fire.

What each release produces:

- **Two architectures**, `linux/amd64` and `linux/arm64`, in one manifest, so
  `docker pull` selects the right one automatically.
- **Both registries**, GHCR and Docker Hub, from the same per-architecture
  builds — each digest is pushed to both, so the registries can never diverge.
- **OCI labels**, including `org.opencontainers.image.source` pointing at this
  repository. That also serves the AGPL's source-availability requirement: the
  image itself carries a link to the code it was built from.
- **An SBOM and provenance attestation**, attached to the image manifest,
  recording what went into it and how it was built. These are verifiable but
  **not cryptographically signed** — signing would require a separate cosign or
  Sigstore step, which this pipeline does not yet do.
- **A vulnerability scan that gates the push.** The workflow builds and scans
  each architecture before pushing it, and fails if Trivy reports a HIGH or
  CRITICAL issue _that has a fix available_. Unfixable CVEs are reported but do
  not block a release, since there would be nothing to do about them. The full
  report, including MEDIUM and LOW, is uploaded to the repository's Security
  tab.

### One-time setup

Two repository secrets are required, under **Settings → Secrets and variables →
Actions**:

| Secret               | Value                                                |
| -------------------- | ---------------------------------------------------- |
| `DOCKERHUB_USERNAME` | `teamcoderz`                                         |
| `DOCKERHUB_TOKEN`    | A Docker Hub access token with **Read, Write** scope |

Create the token at **Docker Hub → Account settings → Personal access tokens**.
Do not use your account password: with 2FA enabled it will not work anyway, and
a scoped token can be revoked on its own.

GHCR needs no secret. It authenticates with the `GITHUB_TOKEN` that GitHub mints
for each run and expires when the run ends.

> Docker Hub also supports keyless OIDC login, which avoids storing a token at
> all, but it requires a Docker Team or Business subscription or membership of
> the Docker-Sponsored Open Source programme. On a free account, a token is the
> only option — so treat it as a credential: rotate it periodically, and revoke
> it immediately if the repository's secrets are ever exposed.

### Publishing by hand

If Actions is unavailable, the same result can be produced locally. You need
Docker with `buildx`, and you must be logged in to whichever registry you are
pushing to.

```bash
docker login                    # Docker Hub — use an access token, not a password
```

```bash
echo "$GITHUB_TOKEN" | docker login ghcr.io -u <your-github-username> --password-stdin
```

Build and push both architectures in one command. On a machine of a single
architecture the other is emulated through QEMU, which is slower but produces a
correct image:

```bash
docker buildx build --platform linux/amd64,linux/arm64 --sbom=true --provenance=mode=max --tag ghcr.io/teamcoderz/wordyme:1.2.3 --tag ghcr.io/teamcoderz/wordyme:latest --tag teamcoderz/wordyme:1.2.3 --tag teamcoderz/wordyme:latest --push .
```

Then confirm both architectures are present:

```bash
docker buildx imagetools inspect ghcr.io/teamcoderz/wordyme:1.2.3
```

You should see two manifests, one `linux/amd64` and one `linux/arm64`. If only
one appears, the build fell back to a single platform and the tag should not be
released.

### Inspecting a published image

Anyone can check what they are about to run:

```bash
docker buildx imagetools inspect ghcr.io/teamcoderz/wordyme:latest --format '{{ json .Provenance }}'
```

```bash
docker buildx imagetools inspect ghcr.io/teamcoderz/wordyme:latest --format '{{ json .SBOM }}'
```

## Support

For issues or questions:

1. Check the logs: `docker compose logs`
2. Review this documentation
3. Check the main [README.md](README.md) for general project information
4. Open an issue on the repository
