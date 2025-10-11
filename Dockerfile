# Multi-stage build for Nourish Buddy
# syntax=docker/dockerfile:1

# Build stage for client
FROM oven/bun:1 AS client-builder

WORKDIR /app

# Copy client package files
COPY client/package.json client/bun.lock ./client/

# Copy root package files for workspace resolution
COPY package.json bun.lock ./

# Ensure shared types are available for client build imports
COPY shared/ ./shared/

# Install client dependencies
WORKDIR /app/client
RUN bun install --frozen-lockfile

# Copy client source
COPY client/ ./

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
COPY server/ ./server/
COPY shared/ ./shared/

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
COPY --from=server-builder /app/dist ./dist
COPY --from=server-builder /app/shared ./shared

# Copy built client assets
COPY --from=client-builder /app/client/dist ./client/dist

# Create non-root user with UNRAID compatible IDs (GID 100 already exists as 'users')
RUN adduser --system --uid 99 --ingroup users bunuser

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