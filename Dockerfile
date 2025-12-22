# Multi-stage build for Nourish Buddy
# syntax=docker/dockerfile:1

# Build stage for client
FROM oven/bun:1 AS client-builder

WORKDIR /app

# Copy root package files and install root deps so shared/* can resolve packages (e.g., zod)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy client package files and install client deps
COPY client/package.json client/bun.lock ./client/
WORKDIR /app/client
RUN bun install --frozen-lockfile

# Copy sources
COPY shared/ /app/shared/
COPY client/ /app/client/

# Build client
RUN bun run build

# Build stage for server
FROM oven/bun:1 AS server-builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install all dependencies
RUN bun install --frozen-lockfile

# Copy server source
COPY server/ /app/server/
COPY shared/ /app/shared/

# Build server bundle
RUN bun run build:server

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install production dependencies only
RUN bun install --frozen-lockfile --production

# Copy built server bundle and any runtime shared types
COPY --from=server-builder /app/dist /app/dist
COPY --from=server-builder /app/shared /app/shared

# Copy built client assets
COPY --from=client-builder /app/client/dist /app/client/dist

# Create non-root user with UNRAID compatible IDs (GID 100 already exists as 'users')
RUN useradd --system --uid 99 --gid 100 --no-create-home bunuser

# Create data directory with proper permissions
RUN mkdir -p /app/data && \
    chown -R bunuser:users /app /app/data

# Switch to non-root user
USER bunuser

# Expose port
EXPOSE 8080

# Health check using inline script (no separate file needed)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:8080/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Run the server
CMD ["bun", "run", "start"]