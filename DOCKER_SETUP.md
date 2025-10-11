# Docker Setup Summary

## Files Created

### 1. Dockerfile
A multi-stage Docker build that:
- **Stage 1**: Builds the React client using Vite
- **Stage 2**: Builds the Bun/Hono server
- **Stage 3**: Creates a minimal runtime image with both built client and server

Key features:
- Uses official `oven/bun` images for consistency
- Multi-stage build reduces final image size
- Runs as non-root user (`bun`) for security
- Includes health check endpoint
- Exposes port 8080
- Creates `/app/data` directory for SQLite database

### 2. .dockerignore
Optimizes Docker build by excluding:
- node_modules (will be installed fresh)
- Built artifacts (will be rebuilt)
- Development files (.env, .git, etc.)
- IDE and OS-specific files

### 3. docker-compose.yml
Simplifies local Docker testing with:
- Port mapping (8080:8080)
- Environment variable configuration
- Volume for database persistence
- Health checks
- Auto-restart policy

### 4. DOCKER.md
Comprehensive documentation covering:
- Quick start with docker-compose
- Manual Docker commands
- Environment variable requirements
- Password hash and secret generation
- Data persistence strategy
- Production deployment considerations
- Reverse proxy example (nginx)
- GitHub Container Registry usage
- Troubleshooting guide

### 5. .env.docker
Template environment file specifically for Docker deployments with:
- Production defaults
- Docker-specific paths
- Comments explaining each variable
- Links to generation commands

## Code Changes

### server/index.ts
Updated to serve static files in production:
- Imports `serveStatic` from `hono/bun`
- Moved `getEnv()` call to top level to avoid duplicate declarations
- Conditionally serves built client files when `NODE_ENV=production`:
  - Static assets from `/assets/*`
  - Service worker
  - Manifest
  - SPA fallback (index.html for all non-API routes)

This allows a single server to handle both API requests (`/api/*`) and serve the React SPA in production.

## How It Works

### Development (unchanged)
- Client runs on Vite dev server (port 5173)
- Server runs separately (port 8080)
- CORS allows client to call API

### Production (Docker)
- Client is pre-built into static files
- Server serves both API and static files
- Single port (8080) for everything
- `ALLOWED_ORIGIN` should match the container's public URL

## GitHub Actions Integration

The existing `.github/workflows/docker-publish.yml` workflow will:
1. Trigger on new releases
2. Build the Docker image using the new Dockerfile
3. Push to GitHub Container Registry (ghcr.io)
4. Tag with version numbers and 'latest'

No changes needed to the workflow - it's already configured correctly!

## Testing the Docker Setup

1. **Build locally**:
   ```bash
   docker build -t nourish-buddy:test .
   ```

2. **Run with docker-compose**:
   ```bash
   cp .env.docker .env
   # Edit .env with your values
   docker-compose up
   ```

3. **Access the app**:
   - Open http://localhost:8080
   - Should see the React app
   - API available at http://localhost:8080/api/*

## Next Steps

1. Test the Docker build locally
2. Update `.env` with production values before deploying
3. Consider setting up a reverse proxy for HTTPS
4. Create a release to trigger automatic Docker image publishing
5. Pull and deploy the published image from GHCR

## Security Considerations

- Container runs as non-root user
- Health checks ensure service availability
- Secrets should be managed via Docker secrets or env vars (not committed)
- HTTPS required in production (use reverse proxy)
- VAPID keys needed for push notifications in production
