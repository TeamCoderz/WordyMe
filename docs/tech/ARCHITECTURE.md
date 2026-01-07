# Architecture

WordyMe is built as a monorepo using [Turborepo](https://turborepo.com). Ideally suited for scaling, this structure separates concerns into individual applications and packages.

## Monorepo Structure

### Applications

- **`apps/web`**: Frontend React application built with Vite.
- **`apps/backend`**: Backend Express.js API server.

### Packages

- **`@repo/editor`**: Rich text editor built with Lexical, supporting diagrams (Mermaid), math (KaTeX), and more.
- **`@repo/ui`**: Shared UI component library, based on shadcn/ui.
- **`@repo/sdk`**: Client SDK for API communication.
- **`@repo/types`**: Shared TypeScript type definitions.
- **`@repo/lib`**: Shared utility functions.
- **`@repo/shared`**: Shared business logic.
- **`@repo/eslint-config`**: Shared ESLint configurations.
- **`@repo/typescript-config`**: Shared TypeScript configurations.

## Project Structure

```
WordyMe/
├── apps/
│   ├── backend/          # Express.js API server
│   │   ├── src/
│   │   │   ├── routes/   # API route handlers
│   │   │   ├── services/ # Business logic
│   │   │   ├── models/   # Database models
│   │   │   ├── schemas/  # Zod validation schemas
│   │   │   └── lib/      # Core libraries (auth, db, socket)
│   │   └── storage/      # File storage and database
│   └── web/             # React frontend application
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── routes/      # TanStack Router routes
│       │   ├── queries/     # TanStack Query hooks
│       │   ├── store/       # Zustand stores
│       │   └── utils/       # Utility functions
│       └── public/          # Static assets
├── packages/
│   ├── editor/          # Lexical-based rich text editor
│   ├── ui/              # Shared UI components
│   ├── sdk/             # API client SDK
│   ├── types/           # TypeScript type definitions
│   ├── lib/             # Shared utilities
│   └── shared/          # Shared business logic
└── turbo.json           # Turborepo configuration
```

## Build System

This project uses **Turborepo** for:

- **Parallel execution**: Run tasks across packages in parallel.
- **Caching**: Intelligent caching of build outputs.
- **Task dependencies**: Automatic dependency resolution.
- **Remote caching**: Share build caches across team and CI/CD.

### Remote Caching

Turborepo supports remote caching with Vercel. To enable:

```bash
# Authenticate with Vercel
pnpm exec turbo login

# Link your repository
pnpm exec turbo link
```
