# Multi-stage Dockerfile for SecureDoc DMS Production
# Stage 1: Build React Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine
WORKDIR /app

# Install production dependencies for server
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# Copy server code
COPY server/ ./

# Copy built frontend assets from stage 1
COPY --from=client-builder /app/client/dist /app/client/dist

# Security: run as non-root node user
RUN chown -R node:node /app
USER node

# Environment defaults
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
