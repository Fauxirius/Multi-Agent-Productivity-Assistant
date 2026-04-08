# ============================================================
# Dockerfile — Multi-Agent Productivity Assistant
# ============================================================
# Multi-stage build using lightweight Node.js Alpine image.
# Stage 1: Build TypeScript → JavaScript
# Stage 2: Production runtime with only compiled output
# ============================================================

# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (for Docker layer caching)
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for tsc)
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# ── Stage 2: Production Runtime ─────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Security: run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Copy static frontend assets
COPY public/ ./public/

# Copy setup scripts (optional, for reference)
COPY setup/ ./setup/

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Cloud Run expects port 8080
ENV PORT=8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

# Start the server
CMD ["node", "dist/server.js"]
