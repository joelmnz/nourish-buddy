# Docker Deployment Guide

This guide explains how to build and run Nourish Buddy using Docker.

## Quick Start with Docker Compose

1. **Create a `.env` file** with your configuration:

```bash
cp .env.example .env
# Edit .env with your values
```

2. **Run with Docker Compose**:

```bash
docker-compose up -d
```

The application will be available at `http://localhost:8080`.

## Building the Docker Image

### Build locally

```bash
docker build -t nourish-buddy:latest .
```

### Build with specific tag

```bash
docker build -t nourish-buddy:1.0.0 .
```

## Running the Container

### Basic run

```bash
docker run -d \
  -p 8080:8080 \
  -v nourish-data:/app/data \
  -e SESSION_SECRET="your-secret-here" \
  -e ADMIN_USERNAME="admin" \
  -e ADMIN_PASSWORD_HASH="your-bcrypt-hash" \
  -e ALLOWED_ORIGIN="http://localhost:8080" \
  --name nourish-buddy \
  nourish-buddy:latest
```

### Run with env file

```bash
docker run -d \
  -p 8080:8080 \
  -v nourish-data:/app/data \
  --env-file .env \
  --name nourish-buddy \
  nourish-buddy:latest
```

## Environment Variables

Required environment variables:

- `ADMIN_USERNAME` - Admin username
- `ADMIN_PASSWORD_HASH` - Bcrypt hash of admin password
- `SESSION_SECRET` - Secret for session encryption (32+ characters)
- `ALLOWED_ORIGIN` - CORS allowed origin (use container URL in production)

Optional environment variables:

- `PORT` - API port (default: 8080)
- `NODE_ENV` - Environment (default: production)
- `DATABASE_PATH` - SQLite database path (default: /app/data/nourish.sqlite)
- `VAPID_PUBLIC_KEY` - VAPID public key for push notifications
- `VAPID_PRIVATE_KEY` - VAPID private key for push notifications
- `VAPID_SUBJECT` - VAPID subject (mailto: or https:// URL)

## Generating Required Values

### Password hash

```bash
bun run hash.js your-password
```

Or using Docker:

```bash
docker run --rm -it oven/bun:1 \
  bash -c "bun add bcryptjs && bun -e \"console.log(require('bcryptjs').hashSync('your-password', 10))\""
```

### Session secret

```bash
openssl rand -base64 32
```

### VAPID keys (for push notifications)

```bash
npx web-push generate-vapid-keys
```

## Data Persistence

The SQLite database is stored in `/app/data` inside the container. Use a Docker volume to persist data:

```bash
# Create a named volume
docker volume create nourish-data

# Use it when running the container
docker run -v nourish-data:/app/data ...
```

## Health Checks

The container includes a health check that verifies the API is responding:

```bash
docker ps  # Check STATUS column for health status
```

## Accessing Logs

```bash
docker logs nourish-buddy
```

Follow logs in real-time:

```bash
docker logs -f nourish-buddy
```

## Stopping and Removing

```bash
# Stop the container
docker stop nourish-buddy

# Remove the container
docker rm nourish-buddy

# Remove the image
docker rmi nourish-buddy:latest
```

## Production Deployment

### Important considerations

1. **HTTPS**: Use a reverse proxy (nginx, Traefik, Caddy) to handle HTTPS
2. **ALLOWED_ORIGIN**: Set to your actual domain (e.g., `https://nourish.example.com`)
3. **Secrets**: Use Docker secrets or encrypted environment variables
4. **Backups**: Regularly backup the `/app/data` volume
5. **Updates**: Pull new images and restart with data volume preserved

### Example with reverse proxy (nginx)

```nginx
server {
    listen 80;
    server_name nourish.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nourish.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## GitHub Container Registry

Images are automatically published to GitHub Container Registry on releases.

### Pull from GHCR

```bash
docker pull ghcr.io/joelmnz/nourish-buddy:latest
```

### Run from GHCR

```bash
docker run -d \
  -p 8080:8080 \
  -v nourish-data:/app/data \
  --env-file .env \
  --name nourish-buddy \
  ghcr.io/joelmnz/nourish-buddy:latest
```

## Troubleshooting

### Container fails to start

Check logs:
```bash
docker logs nourish-buddy
```

### Database errors

Ensure the data volume has correct permissions:
```bash
docker run --rm -v nourish-data:/data alpine chown -R 1000:1000 /data
```

### CORS errors

Verify `ALLOWED_ORIGIN` matches your client URL exactly, including protocol and port.

### Push notifications not working

1. Ensure VAPID keys are set
2. Use HTTPS in production (required for service workers)
3. Check browser console for service worker errors

## Development vs Production

- **Development**: Run client and server separately (see main README.md)
- **Production**: Docker serves built client and API from single container
- **Environment**: Set `NODE_ENV=production` in Docker
