# Dockerfile for Nourish Buddy
# Multi-stage build: Build client and server, then create minimal runtime image

# Stage 1: Build the client (React + Vite)
FROM oven/bun:1 AS client-builder

WORKDIR /app

# Copy client package files
COPY client/package.json client/bun.lockb ./client/

# Install client dependencies
RUN cd client && bun install --frozen-lockfile

# Copy client source
COPY client ./client
COPY shared ./shared

# Build the client for production
RUN cd client && bun run build

# Stage 2: Build the server
FROM oven/bun:1 AS server-builder

WORKDIR /app

# Copy root package files
COPY package.json bun.lockb ./

# Install server dependencies
RUN bun install --frozen-lockfile --production

# Copy server source
COPY server ./server
COPY shared ./shared
COPY drizzle.config.ts ./
COPY tsconfig.json ./

# Build the server
RUN bun run build:server

# Stage 3: Runtime image
FROM oven/bun:1-slim

WORKDIR /app

# Install only production dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy built server from builder
COPY --from=server-builder /app/dist ./dist

# Copy built client from builder
COPY --from=client-builder /app/client/dist ./client/dist

# Copy server runtime files
COPY server ./server
COPY shared ./shared

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R bun:bun /app/data

# Use non-root user
USER bun

# Expose the API port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:8080/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Set production environment
ENV NODE_ENV=production

# Run the server
CMD ["bun", "run", "dist/index.js"]
