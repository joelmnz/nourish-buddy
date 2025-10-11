# Docker Quick Reference

## Build and Run

```bash
# Build the image
docker build -t nourish-buddy .

# Run with docker-compose (recommended)
docker-compose up -d

# Run manually
docker run -d -p 8080:8080 -v nourish-data:/app/data --env-file .env nourish-buddy
```

## Management

```bash
# View logs
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart

# Check status
docker-compose ps
```

## Database Backup

```bash
# Backup
docker run --rm -v nourish-data:/data -v $(pwd):/backup alpine tar czf /backup/nourish-backup.tar.gz -C /data .

# Restore
docker run --rm -v nourish-data:/data -v $(pwd):/backup alpine tar xzf /backup/nourish-backup.tar.gz -C /data
```

## GitHub Container Registry

```bash
# Pull latest
docker pull ghcr.io/joelmnz/nourish-buddy:latest

# Run from GHCR
docker run -d -p 8080:8080 -v nourish-data:/app/data --env-file .env ghcr.io/joelmnz/nourish-buddy:latest
```

## Troubleshooting

```bash
# Check logs
docker logs nourish-buddy

# Shell into container
docker exec -it nourish-buddy sh

# Inspect volume
docker volume inspect nourish-data

# Remove everything and start fresh
docker-compose down -v
docker-compose up -d
```
