# Technology Stack

## Frontend (`apps/web`)

- **React 19**: UI library.
- **Vite**: Build tool and dev server.
- **TanStack Router**: Type-safe file-based routing.
- **TanStack Query**: Data fetching and state management.
- **Zustand**: Global state management.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lexical**: Rich text editor framework.
- **Mermaid**: Diagram rendering.
- **KaTeX**: Math rendering.
- **PWA Support**: Progressive Web App capabilities.

## Backend (`apps/backend`)

- **Express.js**: Web framework.
- **Better Auth**: Authentication system.
- **Drizzle ORM**: Type-safe database ORM.
- **libSQL (SQLite)**: Embedded database.
- **Socket.io**: Real-time communication.
- **Zod**: Schema validation.

## Development Tools

- **TypeScript**: Type safety across the entire codebase.
- **ESLint**: Code linting.
- **Prettier**: Code formatting.
- **Turborepo**: Monorepo build system.
- **pnpm**: Package manager.

## Code Quality

### TypeScript

All packages use TypeScript with strict type checking. Type definitions are shared through `@repo/types`.

### Linting

ESLint is configured across all packages with shared configurations in `@repo/eslint-config`.

### Formatting

Prettier is used for consistent code formatting. A pre-commit hook (via Lefthook) ensures code is formatted before commits.

## Database

The backend uses **libSQL** (SQLite-compatible) for data storage. The database file is stored in `apps/backend/storage/local.db` by default.

### Migrations

Database migrations are managed with Drizzle Kit.

```bash
cd apps/backend
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```
