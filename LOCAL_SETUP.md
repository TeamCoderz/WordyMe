# Local Setup Guide

This guide will help you set up and run WordyMe on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18 ([Download](https://nodejs.org/))
- **pnpm** 9.0.0 ([Installation Guide](https://pnpm.io/installation))

### Installing pnpm

If you don't have pnpm installed:

```bash
# Using npm
npm install -g pnpm@9.0.0

# Using Homebrew (macOS)
brew install pnpm

# Using standalone script
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

Verify installation:

```bash
pnpm --version
# Should output: 9.0.0
```

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd WordyMe
```

## Step 2: Install Dependencies

Install all dependencies for the monorepo:

```bash
pnpm install
```

This will install dependencies for all apps and packages in the monorepo.

## Step 3: Environment Configuration

### Backend Environment Variables

Create a `.env` file in `apps/backend/`:

```bash
cd apps/backend
cp .env.example .env
```

**Note:** The database file will be created automatically on first run if it doesn't exist.

### Frontend Environment Variables

Create a `.env` file in `apps/web/`:

```bash
cd apps/web
cp .env.example .env
```

## Step 4: Database Setup

The backend uses SQLite (libSQL) which creates the database file automatically. However, if you need to run migrations:

```bash
cd apps/backend

# Generate migrations (if schema changed)
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit migrate
```

## Step 5: Start Development Servers

### Option 1: Start All Services (Recommended)

From the root directory:

```bash
pnpm dev
```

This will start both the backend and frontend in parallel.

### Option 2: Start Services Separately

**Terminal 1 - Backend:**

```bash
cd apps/backend
pnpm dev
```

The backend will start on `http://localhost:3000`

**Terminal 2 - Frontend:**

```bash
cd apps/web
pnpm dev
```

The frontend will start on `http://localhost:5173`

## Step 6: Start Production Servers

Before starting production servers, you need to build the project:

### Build the Project

From the root directory:

```bash
pnpm build
```

This will build both the backend and frontend for production.

### Option 1: Start All Services (Recommended)

From the root directory:

```bash
pnpm start
```

This will start both the backend and frontend in production mode.

### Option 2: Start Services Separately

**Terminal 1 - Backend:**

```bash
cd apps/backend
pnpm start
```

The backend will start on `http://localhost:3000` (or the port specified in your `.env`)

**Terminal 2 - Frontend:**

```bash
cd apps/web
pnpm start
```

The frontend will start on `http://localhost:5173` (preview server for the production build)

**Note:** The frontend `start` command runs `vite preview`, which serves the production build. For a true production server, you would typically use a server like Nginx or serve the `dist` folder with a static file server.

## Step 7: Access the Application

Once both servers are running:

- **Frontend:** Open [http://localhost:5173](http://localhost:5173) in your browser
- **Backend API:** Available at [http://localhost:3000](http://localhost:3000)
- **API Documentation:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs) (if available)

## First-Time Setup

### Create an Account

1. Navigate to the signup page
2. Create your account with email and password
3. You'll be automatically logged in

### Initial Setup

After logging in:

1. Create your first **Space** (a container for organizing documents)
2. Create your first **Document** within the space
3. Start taking notes!

## Troubleshooting

### Port Already in Use

If you get a "port already in use" error:

**Backend (port 3000):**

```bash
# Change PORT in apps/backend/.env
PORT=3001
```

**Frontend (port 5173):**

```bash
# The port is configured in apps/web/vite.config.ts
# You can modify it or kill the process using the port
```

### Database Issues

If you encounter database errors:

1. **Delete and recreate the database:**

   ```bash
   cd apps/backend
   rm storage/local.db
   # Restart the backend - it will create a new database
   ```

2. **Run migrations:**
   ```bash
   cd apps/backend
   pnpm drizzle-kit migrate
   ```

### Dependency Issues

If you encounter dependency-related errors:

```bash
# Clean install
rm -rf node_modules apps/*/node_modules packages/*/node_modules
rm pnpm-lock.yaml
pnpm install
```

### Type Errors

If you see TypeScript errors:

```bash
# Type-check all packages
pnpm check-types

# If errors persist, rebuild packages
pnpm build
```

### Build Errors

If builds fail:

```bash
# Clean build artifacts
rm -rf apps/*/dist packages/*/dist

# Rebuild
pnpm build
```

## Development Tips

### Hot Module Replacement (HMR)

Both frontend and backend support hot reloading:

- **Frontend:** Changes to React components will hot-reload automatically
- **Backend:** Uses `tsx watch` for automatic restarts on file changes

### Type Checking

Run type checking in watch mode:

```bash
# In a separate terminal
pnpm check-types --watch
```

### Linting

Lint your code:

```bash
# Lint all packages
pnpm lint

# Lint specific package
pnpm lint --filter=web
```

### Code Formatting

Format your code:

```bash
# Format all files
pnpm format

# Format specific files
pnpm format --write "apps/web/src/**/*.{ts,tsx}"
```

## Project Structure Overview

```
WordyMe/
├── apps/
│   ├── backend/        # Backend API (Express + libSQL)
│   └── web/            # Frontend App (React + Vite)
├── packages/
│   ├── editor/         # Rich text editor
│   ├── ui/             # UI components
│   ├── sdk/            # API client
│   └── types/          # Type definitions
└── package.json        # Root package.json
```

## Next Steps

- Read the [README.md](README.md) for project documentation
- Explore the codebase structure
- Check out the API documentation at `/api-docs` when the backend is running
- Review the component library in `packages/ui`

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review error messages in the terminal
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly
5. Ensure all dependencies are installed (`pnpm install`)

## Additional Resources

- [Turborepo Documentation](https://turborepo.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [TanStack Router](https://tanstack.com/router)
- [Drizzle ORM](https://orm.drizzle.team)
