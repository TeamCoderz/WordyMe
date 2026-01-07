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

2. **Set up environment variables** (optional):
   Copy the example environment file and customize as needed:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and update the values, especially `BETTER_AUTH_SECRET` for production:

   ```bash
   # Generate a secure secret for production
   openssl rand -base64 32
   ```

   > **Note**:
   >
   > - The `.env` file is excluded from Docker builds (via `.dockerignore`) for security, but Docker Compose will still read it for variable substitution in `docker-compose.yml`
   > - The `.env.example` file serves as a template with all available environment variables documented

3. **Build and start the containers**:

   ```bash
   docker compose up -d
   ```

4. **Access the application**:
   - **Web Application**: http://localhost:5173
   - **Backend API**: http://localhost:3000

## Docker Compose Services

The `docker-compose.yml` file defines two services:

### Backend Service

- **Container Name**: `wordyme-backend`
- **Port**: `3000:3000`
- **Image**: Built from `Dockerfile` (target: `backend`)
- **Environment Variables**:
  - `NODE_ENV=production`
  - `PORT=3000`
  - `DB_FILE_NAME=file:storage/local.db`
  - `CLIENT_URL=http://localhost:5173`
  - `BETTER_AUTH_SECRET` (from `.env` or default)
- **Volumes**:
  - `wordyme-storage` - Persists SQLite database and uploaded files
- **Restart Policy**: `unless-stopped`
- **Health Check**:
  - Tests HTTP endpoint every 30 seconds
  - Timeout: 10 seconds
  - Retries: 3
  - Start period: 40 seconds

### Web Service

- **Container Name**: `wordyme-web`
- **Port**: `5173:80` (maps to Nginx port 80)
- **Image**: Built from `Dockerfile` (target: `web`)
- **Build Args**:
  - `VITE_BACKEND_URL` - Backend URL for the frontend (from `.env` or empty for same-origin)
- **Depends On**: `backend` service
- **Restart Policy**: `unless-stopped`
- **Features**:
  - Serves static files via Nginx
  - Proxies `/api/` requests to the backend
  - Proxies `/storage/` requests to the backend (for file uploads and downloads, max 10MB upload size)
  - Proxies `/socket.io/` WebSocket connections to the backend (for real-time updates, 24h timeout)
  - Gzip compression enabled
  - SPA routing support with fallback to `index.html`

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

# View logs for a specific service
docker compose logs backend
docker compose logs web

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
- **Mount Point**: `/app/storage` in the backend container

### Backup Database

```bash
# Create a backup
docker compose exec backend cp storage/local.db storage/local.db.backup

# Copy database from container to host
docker compose cp backend:/app/storage/local.db ./backup-local.db
```

### Restore Database

```bash
# Copy database from host to container
docker compose cp ./backup-local.db backend:/app/storage/local.db

# Restart the backend service
docker compose restart backend
```

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
- **Runtime variables** (backend) are passed to containers through the `environment` section in `docker-compose.yml`
- **Build-time variables** (web app and backend secrets) are passed as build args and embedded during the Docker build
- See `.env.example` for a complete list of all environment variables with descriptions

### What's Excluded from Docker Builds

The `.dockerignore` file excludes the following from Docker builds:

- **Dependencies**: `node_modules`, `.pnpm-store`
- **Build outputs**: `dist`, `build`, `.turbo`
- **Environment files**: `.env`, `.env.local`, `.env.*` (but keeps `.env.example`)
- **Database files**: `*.db`, `*.sqlite`, `*.sqlite-journal` (prevents copying local dev databases)
- **Version control**: `.git`
- **Logs**: `npm-debug.log*`, `yarn-debug.log*`, `pnpm-debug.log*`
- **System files**: `.DS_Store`

This ensures:

- Smaller build context and faster builds
- No accidental inclusion of secrets or local databases
- Clean production images

### Method 2: Directly in `docker-compose.yml`

You can also modify the `environment` section directly in `docker-compose.yml`:

```yaml
environment:
  - BETTER_AUTH_SECRET=your-secret-key-here
  - CLIENT_URL=http://localhost:5173
```

### Available Environment Variables

#### Backend (Runtime Variables)

These variables are available at runtime and can be changed without rebuilding:

| Variable             | Description                   | Default                                              |
| -------------------- | ----------------------------- | ---------------------------------------------------- |
| `BETTER_AUTH_SECRET` | Secret key for authentication | `change-me-in-production-use-openssl-rand-base64-32` |
| `CLIENT_URL`         | Frontend URL for CORS         | `http://localhost:5173`                              |
| `NODE_ENV`           | Node environment              | `production`                                         |
| `PORT`               | Backend port                  | `3000`                                               |
| `DB_FILE_NAME`       | Database file path            | `file:storage/local.db`                              |

#### Web App (Build-time Variables)

These variables are embedded into the JavaScript bundle at build time. To change them, you must rebuild the Docker image:

| Variable           | Description                                                                           | Default |
| ------------------ | ------------------------------------------------------------------------------------- | ------- |
| `VITE_BACKEND_URL` | Backend URL for API calls. Leave empty for same-origin (recommended with Nginx proxy) | Empty   |

> **Note**: Since `VITE_BACKEND_URL` is a build-time variable, if you change it in `.env`, you need to rebuild the web service:
>
> ```bash
> docker compose build web
> docker compose up -d
> ```

## Troubleshooting

### Port Already in Use

If you get an error that ports 3000 or 5173 are already in use:

1. **Change ports in `docker-compose.yml`**:

   ```yaml
   ports:
     - '3001:3000' # Change host port to 3001
     - '5174:80' # Change host port to 5174
   ```

2. **Or stop the conflicting service**:

   ```bash
   # Find what's using the port (Windows)
   netstat -ano | findstr :3000

   # Find what's using the port (Linux/Mac)
   lsof -i :3000
   ```

### Database Issues

If you encounter database errors:

1. **Check volume permissions**:

   ```bash
   docker compose exec backend ls -la storage/
   ```

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
   docker compose logs backend
   docker compose logs web
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

- **Multi-stage builds** for smaller images (pruner → builder → backend/web)
- **Turbo pruning** to include only necessary monorepo packages
- **Production dependencies only** (via `pnpm --prod deploy`)
- **Database migrations** run during build for faster startup
- **Seed database** created during build
- **Optimized Nginx configuration** with gzip and proper proxying
- **Health checks enabled** for backend service
- **Automatic restarts** on failure (`unless-stopped` restart policy)
- **Non-root user** for backend security

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

- **Base**: `node:20-alpine` with `sqlite` and `libc6-compat`
- **Package Manager**: pnpm 9.0.0 (via Corepack)
- **Process**:
  1. Copies pruned files from pruner stage
  2. Installs dependencies with `pnpm install --frozen-lockfile`
  3. Runs database migrations (`pnpm drizzle-kit migrate`)
  4. Builds both backend and frontend applications
  5. Creates production deployment for backend
- **Build Args**:
  - `VITE_BACKEND_URL` - Embedded into web app bundle
- **Output**: Built applications and a seed database (`local.db`)

### Stage 3: Backend Runner

- **Base**: `node:20-alpine` with `sqlite`
- **User**: Runs as non-root user (`nodejs`, UID 1001)
- **Features**:
  - Copies production backend from builder
  - Copies seed database to `storage/local.db`
  - Creates `storage` directory with proper permissions
  - Exposes port 3000
- **Command**: `node dist/index.js`

### Stage 4: Web Runner

- **Base**: `nginx:alpine`
- **Features**:
  - Serves static files from `/usr/share/nginx/html`
  - Nginx configuration with:
    - Gzip compression for text-based files
    - SPA routing (fallback to `index.html`)
    - Proxy `/api/` → `http://backend:3000`
    - Proxy `/storage/` → `http://backend:3000` (10MB max upload)
    - Proxy `/socket.io/` → `http://backend:3000` (WebSocket with 24h timeout)
  - Exposes port 80

This approach results in:

- **Smaller final images**: Only production dependencies and built artifacts
- **Faster builds**: Turbo pruning reduces build context, layer caching optimizes rebuilds
- **Better security**: Minimal base images, non-root user for backend
- **Separation of concerns**: Backend and frontend in separate containers
- **Efficient proxying**: All backend endpoints accessible through Nginx
- **Database initialization**: Seed database created during build for faster startup

## Advanced Usage

### Running Individual Services

```bash
# Start only the backend
docker compose up -d backend

# Start only the web frontend
docker compose up -d web
```

### Executing Commands in Containers

```bash
# Access backend container shell
docker compose exec backend sh

# Run a command in backend
docker compose exec backend node -v

# Access web container shell
docker compose exec web sh
```

### Custom Network Configuration

The services automatically create a Docker network. To use a custom network, modify `docker-compose.yml`:

```yaml
services:
  backend:
    networks:
      - wordyme-network
  web:
    networks:
      - wordyme-network

networks:
  wordyme-network:
    driver: bridge
```

## Security Considerations

1. **Change Default Secrets**: Always set `BETTER_AUTH_SECRET` in production using a secure random value:

   ```bash
   openssl rand -base64 32
   ```

2. **Environment Files**: `.env` files are excluded from Docker builds (via `.dockerignore`) to prevent secrets from being baked into images. Docker Compose still reads them for variable substitution, but they remain on the host system only.

3. **Non-Root User**: The backend container runs as a non-root user (`nodejs`, UID 1001) for better security isolation.

4. **Minimal Base Images**: Uses Alpine Linux base images for smaller attack surface.

5. **Use HTTPS**: In production, use a reverse proxy (e.g., Traefik, Nginx) with SSL certificates.

6. **Limit Port Exposure**: Only expose necessary ports (3000 for backend, 5173 for web).

7. **Regular Updates**: Keep Docker images and base images updated with security patches.

8. **Volume Permissions**: The `storage` directory is created with proper ownership for the `nodejs` user.

9. **Database Isolation**: Local development databases are excluded from builds to prevent accidental data leaks.

## Support

For issues or questions:

1. Check the logs: `docker compose logs`
2. Review this documentation
3. Check the main [README.md](README.md) for general project information
4. Open an issue on the repository
