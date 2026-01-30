# Backend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared

# Build TypeScript (shared package first, then backend)
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/backend

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    postgresql-client \
    dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install production dependencies (skip prepare script to avoid husky errors in Docker)
RUN npm ci --production --ignore-scripts

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ && \
    npm rebuild bcrypt && \
    apk del python3 make g++

# Copy built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist

# Create logs directory with proper permissions
RUN mkdir -p /app/packages/backend/logs && \
    chown -R nodejs:nodejs /app/packages/backend/logs

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if(r.statusCode !== 200) throw new Error(r.status)})"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "packages/backend/dist/index.js"]