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
- **Health Check**: Monitors backend availability every 30 seconds

### Web Service

- **Container Name**: `wordyme-web`
- **Port**: `5173:80` (maps to Nginx port 80)
- **Image**: Built from `Dockerfile` (target: `web`)
- **Build Args**:
  - `VITE_BACKEND_URL` - Backend URL for the frontend (from `.env` or empty for same-origin)
- **Depends On**: `backend` service
- **Features**:
  - Serves static files via Nginx
  - Proxies `/api/` requests to the backend
  - Proxies `/storage/` requests to the backend (for file uploads and downloads)
  - Proxies `/socket.io/` WebSocket connections to the backend (for real-time updates)
  - Gzip compression enabled
  - SPA routing support

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
- **Location**: Managed by Docker (typically in `/var/lib/docker/volumes/`)
- **Contains**:
  - SQLite database (`local.db`)
  - Uploaded files and user content

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
- **Build-time variables** (web app) are passed as build args and embedded into the JavaScript bundle during the Docker build
- See `.env.example` for a complete list of all environment variables with descriptions

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

| Variable           | Description                                                                 | Default |
| ------------------ | --------------------------------------------------------------------------- | ------- |
| `VITE_BACKEND_URL` | Backend URL for API calls. Leave empty for same-origin (recommended with Nginx proxy) | Empty   |

> **Note**: Since `VITE_BACKEND_URL` is a build-time variable, if you change it in `.env`, you need to rebuild the web service:
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

- Multi-stage builds for smaller images
- Production dependencies only
- Optimized Nginx configuration
- Health checks enabled
- Automatic restarts on failure

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

The `Dockerfile` uses a multi-stage build process:

1. **Pruner Stage**: Prunes the monorepo to only include necessary files
2. **Builder Stage**: Installs dependencies and builds the application
   - Accepts build args for web app environment variables (e.g., `VITE_BACKEND_URL`)
   - Builds both backend and frontend applications
3. **Backend Stage**: Creates a minimal Node.js image for the backend
4. **Web Stage**: Creates an Nginx image for serving the frontend
   - Configures Nginx to proxy multiple endpoints:
     - `/api/` - API requests
     - `/storage/` - File uploads and downloads
     - `/socket.io/` - WebSocket connections for real-time updates
   - Enables Gzip compression
   - Supports SPA routing with fallback to `index.html`

This approach results in:

- Smaller final images
- Faster builds (with layer caching)
- Better security (minimal base images)
- Separation of concerns
- Efficient proxying of all backend endpoints through Nginx

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

1. **Change Default Secrets**: Always set `BETTER_AUTH_SECRET` in production
2. **Environment Files**: `.env` files are excluded from Docker builds (via `.dockerignore`) to prevent secrets from being baked into images. Docker Compose still reads them for variable substitution, but they remain on the host system only.
3. **Use HTTPS**: In production, use a reverse proxy (e.g., Traefik, Nginx) with SSL
4. **Limit Port Exposure**: Only expose necessary ports
5. **Regular Updates**: Keep Docker images and base images updated
6. **Volume Permissions**: Ensure proper file permissions for volumes

## Support

For issues or questions:

1. Check the logs: `docker compose logs`
2. Review this documentation
3. Check the main [README.md](README.md) for general project information
4. Open an issue on the repository
