# Wordy Vite App

This is the Vite + TanStack Router version of the Wordy application, migrated from Next.js.

## Features

- **Vite**: Fast build tool and development server
- **TanStack Router**: Type-safe routing with file-based routing
- **Supabase**: Direct client SDK integration (no API routes needed)
- **React 19**: Latest React features
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: State management

## Migration from Next.js

This app has been migrated from the Next.js version with the following changes:

1. **API Routes Replaced**: All Next.js API routes have been replaced with direct Supabase client SDK calls
2. **File-based Routing**: Next.js App Router replaced with TanStack Router file-based routing
3. **Server-side Rendering**: Removed SSR in favor of client-side rendering
4. **Environment Variables**: Changed from `NEXT_PUBLIC_` to `VITE_` prefix

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create environment file:

   ```bash
   cp env.example .env
   ```

3. Add your Supabase credentials to `.env`:

   ```
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run serve` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Project Structure

```
src/
├── components/     # React components (migrated from Next.js)
├── lib/           # Utility functions and Supabase client
├── routes/        # TanStack Router routes
├── store/         # Zustand state management
├── App.tsx        # Main app component
├── App.css        # Global styles
└── main.tsx       # Entry point
```

## Key Differences from Next.js

### API Calls

Instead of calling Next.js API routes, the app now uses direct Supabase client calls:

```typescript
// Before (Next.js)
const response = await fetch('/api/documents');
const data = await response.json();

// After (Vite + Supabase)
const { data, error } = await documentsApi.getDocuments();
```

### Routing

File-based routing with TanStack Router:

```typescript
// routes/documents/$documentId.tsx
export const Route = createFileRoute('/documents/$documentId')({
  component: DocumentPage,
});
```

### Authentication

Direct Supabase auth integration:

```typescript
import { getCurrentUser, signOut } from '../lib/supabase';

const user = await getCurrentUser();
```

## Environment Variables

| Variable                 | Description                 |
| ------------------------ | --------------------------- |
| `VITE_SUPABASE_URL`      | Your Supabase project URL   |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## Development

The app uses Vite for fast development with HMR (Hot Module Replacement). The TanStack Router provides type-safe routing and automatic code splitting.

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

## Deployment

The app can be deployed to any static hosting service like Vercel, Netlify, or GitHub Pages since it's a client-side application.
