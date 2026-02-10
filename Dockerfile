# Stage 1: Install dependencies
FROM node:20-alpine AS deps

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner

# Install build tools needed for better-sqlite3 runtime, plus cron/tz/su-exec for weekly session creation
RUN apk add --no-cache python3 make g++ curl tzdata su-exec

WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Europe/Lisbon

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Install Claude CLI globally for photo bill analysis
RUN npm install -g @anthropic-ai/claude-code

# Create data directory for SQLite database
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Copy entrypoint and cron scripts
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
COPY scripts/create-session.sh /app/create-session.sh
RUN chmod +x /app/docker-entrypoint.sh /app/create-session.sh

# Set up crontab: create session every Monday at 19:55 Lisbon time
RUN echo "55 19 * * 1 /app/create-session.sh >> /proc/1/fd/1 2>&1" | crontab -

# Set ownership
RUN chown -R nextjs:nodejs /app

EXPOSE 3030

ENV PORT=3030
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
