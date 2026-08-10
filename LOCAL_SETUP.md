# Local Setup Guide

This guide sets up WordyMe for development, running the backend and frontend
directly on your machine with hot reloading.

If you only want to _run_ WordyMe rather than work on it, use Docker instead —
see [DOCKER.md](DOCKER.md). That path is a single command and needs no toolchain.

## Prerequisites

- **Node.js** >= 22 ([Download](https://nodejs.org/))
- **pnpm** 10.33.0 ([Installation Guide](https://pnpm.io/installation))

### Installing pnpm

The repository pins its package manager in `package.json`, and Corepack reads
that pin, so it is the least error-prone option:

```bash
corepack enable
```

Corepack shipped with Node through v24. It is no longer part of the official
Node 25+ distributions, so on those you install it first:

```bash
npm install -g corepack
```

Otherwise install pnpm yourself:

```bash
# Using npm
npm install -g pnpm@10.33.0

# Using Homebrew (macOS)
brew install pnpm

# Using standalone script
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

Verify:

```bash
pnpm --version
# Should output: 10.33.0
```

pnpm also has to be on your `PATH` for the git pre-commit hooks to run — they
call `pnpm` to add licence headers and format staged files.

## Step 1: Clone the Repository

```bash
git clone https://github.com/TeamCoderz/WordyMe.git
cd WordyMe
```

## Step 2: Install Dependencies

```bash
pnpm install
```

This installs dependencies for every app and package in the monorepo, and
installs the git hooks — the `prepare` script runs `lefthook install` for you.

Confirm the hooks landed, because a commit without them silently skips the
licence header your pull request will then be failed for:

```bash
ls .git/hooks/pre-commit
```

If it is missing, run `pnpm exec lefthook install` by hand.

## Step 3: Environment Configuration

### Backend

```bash
cp apps/backend/.env.example apps/backend/.env
```

Then generate the session-signing secret, which the template deliberately ships
commented out:

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> apps/backend/.env
```

**Do not skip this.** Better Auth does not fail when `BETTER_AUTH_SECRET` is
missing and logs no warning — it quietly falls back to a hard-coded default that
is the same in every install. It refuses to start only under
`NODE_ENV=production`, which nothing in local development sets. Anything signed
with that default, including your session cookies, can be forged by anyone.
Locally that is a small thing; the moment you expose the port to your network, or
reuse the file on a server, it is not.

Changing this value later invalidates existing sessions and logs everyone out.

The remaining settings have working defaults:

| Variable          | Default                 | Notes                                          |
| ----------------- | ----------------------- | ---------------------------------------------- |
| `NODE_ENV`        | `development`           | Leave unset locally                            |
| `PORT`            | `3000`                  | Backend port                                   |
| `DB_FILE_NAME`    | `file:storage/local.db` | Created on first migration                     |
| `TRUST_HOST`      | `true`                  | Also trust the address each request arrives on |
| `CLIENT_URL`      | `http://localhost:5173` | Extra trusted origins, added to the one above  |
| `BETTER_AUTH_URL` | first `CLIENT_URL`      | Public origin of the auth API                  |
| `TRUST_PROXY`     | unset                   | Leave unset locally                            |

With `TRUST_HOST` on, an `Origin` is accepted when it matches the host the
request arrived at, so reaching the dev server over your LAN works without
listing that address. Set it to `false` to accept only `CLIENT_URL`, which is
how the app behaved before this option existed.

Upgrading an existing clone? `DB_FILE_NAME` used to default to `file:local.db`.
An `.env` you already have keeps working untouched, but if you replace it from
the template, bring the database with it — otherwise you are pointed at a new,
empty one, which looks exactly like skipping [Step 4](#step-4-database-setup):

```bash
mv apps/backend/local.db apps/backend/storage/local.db
```

### Frontend

**No `.env` is needed.** `apps/web/.env.example` exists only to document the
optional `VITE_BACKEND_URL`, and every value in it already has a working default.

Copying it is not a neutral act: `VITE_BACKEND_URL` is inlined by Vite at build
time, so setting it to `http://localhost:3000` bakes that address into any
production bundle you build afterwards. Leave it unset and requests stay
relative — which is what the Vite dev proxy needs in development, and what the
backend needs in production when it serves the bundle itself.

### A note on `.env` files and git

`.env` files are gitignored and must never be committed — `apps/backend/.env`
holds your session secret. Only the `.env.example` templates are tracked. If you
add a new setting, add it to the template with a comment, not to your `.env`
alone.

## Step 4: Database Setup

**This step is required on a fresh clone.** The database file is created
automatically, but it is created _empty_ — nothing in the backend applies
migrations at startup (only the Docker image does that, as part of its launch
command). Skip this and the server starts fine, then every request that touches
the database fails with `no such table: users`.

```bash
cd apps/backend
pnpm drizzle-kit migrate
```

Run it again after pulling changes that add migrations.

Only if you have **changed the schema** in `src/models/` do you also need to
generate a migration first:

```bash
pnpm drizzle-kit generate   # writes a new file into drizzle/
pnpm drizzle-kit migrate
```

Commit the generated file along with your schema change.

## Step 5: Start Development Servers

### Option 1: Start Everything (Recommended)

From the root directory — `cd ../..` if Step 4 left you in `apps/backend`:

```bash
pnpm dev
```

Starts the backend and frontend together.

### Option 2: Start Services Separately

**Terminal 1 — Backend:**

```bash
cd apps/backend
pnpm dev
```

Backend on `http://localhost:3000`.

**Terminal 2 — Frontend:**

```bash
cd apps/web
pnpm dev
```

Frontend on `http://localhost:5173`.

The dev server proxies `/api` and `/storage` through to port 3000, so the app
sees a single origin and there is no CORS involved.

## Step 6: Running a Production Build Locally

Build first:

```bash
pnpm build
```

Then:

```bash
pnpm start
```

The backend serves the compiled API from `dist/`, and the frontend is served by
`vite preview` on port 5173. Preview inherits the dev server's proxy
configuration, so `/api` still reaches the backend.

This is a way to check that a production build behaves — it is not how you
deploy. In a real deployment the backend serves the web bundle itself from one
origin; see [DOCKER.md](DOCKER.md).

## Step 7: Access the Application

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3000](http://localhost:3000)
- **API reference:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **OpenAPI document:** [http://localhost:3000/api/docs/openapi.json](http://localhost:3000/api/docs/openapi.json)

Every server route lives under `/api` or `/storage`. That is why the API
reference sits at `/api/docs` and not `/docs` — the web app owns `/docs` and its
sub-routes.

## First-Time Setup

### Create an Account

1. Open [http://localhost:5173](http://localhost:5173)
2. Sign up with an email and password — no verification email is sent locally
3. You are logged in automatically

Sign-up is open only while the database has no users. Once the first account
exists the API rejects further sign-ups, the login page stops offering the link,
and `/signup` redirects to `/login` — so a second local account means resetting
the database first, see [Database Issues](#database-issues).

### Initial Setup

1. Create your first **Space** (a container for organizing documents)
2. Create your first **Document** within the space
3. Start taking notes

## Troubleshooting

### `no such table: users` (or any other table)

Migrations have not been applied. See [Step 4](#step-4-database-setup).

The browser shows a different wording, because the response carries only the
query that failed — the sign-in page is usually where you meet it:

```console
Failed query: select "id" from "users" limit ?
```

`no such table` appears in the terminal running the backend, as the underlying
cause. Any `Failed query:` response on a fresh clone means this.

### Port Already in Use

**Backend (3000):** change `PORT` in `apps/backend/.env`. If you do, the Vite
proxy targets in `apps/web/vite.config.ts` need the same port.

**Frontend (5173):** the port is set twice in `apps/web/vite.config.ts` — under
`server` for `pnpm dev` and under `preview` for `pnpm start` — both with
`strictPort: true`, so Vite fails rather than silently picking another port.
Change both, and add the new origin to `CLIENT_URL` in `apps/backend/.env` or
sign-in will be rejected.

### Sign-in fails with an origin or CORS error

The address in your browser is not in `CLIENT_URL`. It is a list, so reaching the
app over your LAN means adding that origin too:

```bash
CLIENT_URL=http://localhost:5173,http://192.168.1.20:5173
```

Reaching the app by hostname rather than by IP needs one more entry: that
hostname has to be in `server.allowedHosts` in `apps/web/vite.config.ts`, which
lists only `wordyme.test`. An unlisted hostname gets Vite's `Blocked request`
before the request reaches the backend at all, so `CLIENT_URL` is not the fix.
`localhost` and bare IP addresses are always allowed.

### Database Issues

Start over with an empty database:

```bash
cd apps/backend
rm -f storage/local.db storage/local.db-wal storage/local.db-shm storage/local.db-journal
pnpm drizzle-kit migrate
```

This deletes all local data. The `-wal`, `-shm` and `-journal` companions are
SQLite's own; one left behind after the server was killed mid-write can fail the
next open, so they go with it. Uploaded files live alongside the database in
`storage/` and are not removed by this.

### Dependency Issues

```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

Do **not** delete `pnpm-lock.yaml` to fix an install. The lockfile carries
pinned security overrides and dependency patches, and regenerating it silently
resolves everything to whatever is newest — which changes what you are running
and is rarely what you were trying to debug.

### Type Errors

```bash
pnpm check-types
```

Workspace packages are consumed from source, so a type error in one package
surfaces in the apps that import it.

### Build Errors

```bash
rm -rf apps/*/dist packages/*/dist
pnpm build --force
```

`--force` is the point: `build` is a cached Turbo task, so deleting `dist/` on
its own achieves nothing — the next build replays the same output from `.turbo/`
instead of running `tsc` and `vite build` again.

## Development Tips

### Hot Module Replacement

- **Frontend:** React components hot-reload
- **Backend:** `tsx watch` restarts on file changes

### Linting

```bash
pnpm lint                 # all packages
pnpm lint --filter=web    # one package
```

### Code Formatting

```bash
pnpm format         # write
pnpm format:check   # report without changing anything, as CI would
```

This also runs automatically on staged files when you commit — only the staged
ones, via the pre-commit hook. Generated files are exempt through
`.prettierignore`: `routeTree.gen.ts`, the drizzle migrations, and the lockfile
are all rewritten by their own tooling, so formatting them only creates churn.

### Licence Headers

Source files carry an SPDX header, added automatically by the pre-commit hook.
To check or apply it by hand:

```bash
pnpm license:check
pnpm license:fix
```

## Project Structure Overview

```text
WordyMe/
├── apps/
│   ├── backend/            # API (Express 5 + libSQL/SQLite + Socket.io)
│   └── web/                # Web app (React 19 + Vite + TanStack Router)
├── packages/
│   ├── editor/             # Lexical-based rich text editor
│   ├── embed-pdf/          # PDF viewer
│   ├── ui/                 # Shared UI components
│   ├── sdk/                # API client
│   ├── lib/                # Shared utilities
│   ├── shared/             # Code shared between apps
│   ├── types/              # Shared type definitions
│   ├── eslint-config/      # Shared ESLint configuration
│   └── typescript-config/  # Shared TypeScript configuration
└── package.json            # Workspace root
```

## Next Steps

- Read the [README.md](README.md) for project documentation
- Run WordyMe in a container with [DOCKER.md](DOCKER.md)
- Browse the API reference at `/api/docs` while the backend is running

## Getting Help

1. Check the troubleshooting section above
2. Read the terminal output — the backend logs the trusted origins it started with
3. Check the browser console for frontend errors
4. Confirm migrations have been applied
5. Confirm dependencies are installed (`pnpm install`)

## Additional Resources

- [Turborepo Documentation](https://turborepo.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [TanStack Router](https://tanstack.com/router)
- [Drizzle ORM](https://orm.drizzle.team)
- [Better Auth](https://better-auth.com)
