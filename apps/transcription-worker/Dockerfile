# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/transcription-worker/package.json ./apps/transcription-worker/
COPY packages/db/package.json ./packages/db/
COPY packages/tsconfig/package.json ./packages/tsconfig/ 2>/dev/null || true
COPY packages/eslint-config/package.json ./packages/eslint-config/ 2>/dev/null || true

# Install dependencies (workspace-aware)
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/transcription-worker ./apps/transcription-worker
COPY packages/db ./packages/db
COPY packages/tsconfig ./packages/tsconfig

# Build shared packages first, then the worker
RUN pnpm --filter @edusphere/db build
RUN pnpm --filter @edusphere/transcription-worker build

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -S edusphere && adduser -S worker -G edusphere

# Copy built artefacts
COPY --from=builder --chown=worker:edusphere /app/apps/transcription-worker/dist ./dist
COPY --from=builder --chown=worker:edusphere /app/apps/transcription-worker/package.json ./package.json
COPY --from=builder --chown=worker:edusphere /app/node_modules ./node_modules

USER worker

# Env defaults (override via docker-compose / K8s)
ENV NODE_ENV=production
ENV PORT=3100

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3100/health || exit 1

CMD ["node", "dist/main.js"]
